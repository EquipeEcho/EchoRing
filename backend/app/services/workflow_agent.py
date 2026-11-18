"""Gemini agent that explains project workflows and executes permitted workflow actions."""

import logging
import os

from fastapi import HTTPException
from google import genai
from google.genai import types
from sqlalchemy import select

from app.core.portal_auth import ensure_task_access
from app.database_pg import database
from app.db_models import Service, ServiceWorkflow
from app.models.translation_workflow import StageUpdate
from app.repositories.translation_store import read_service
from app.services.translation_workflows_service import (
    TEMPLATES,
    assign_workflow,
    update_stage,
    workflow_record,
)

INSTRUCTIONS = (
    'Você é o agente especialista em fluxo de projetos da Aliança Traduções. '
    'Responda em português, de forma clara, objetiva e organizada. '
    'Use sempre as ferramentas disponíveis para explicar os modelos de fluxo (por inteiro ou por etapas), '
    'consultar o andamento de tarefas ou executar ações permitidas no workflow. '
    'Nunca invente etapas, prazos, status ou permissões que não vieram das ferramentas. '
    'Quando o usuário pedir para avançar, bloquear, retomar ou atribuir um fluxo, execute a ferramenta '
    'correspondente e informe o resultado (ou o motivo exato caso a regra de negócio impeça a ação). '
    'Se a pergunta não tiver relação com fluxos de projeto, etapas ou tarefas do sistema, '
    'informe educadamente que você responde apenas sobre o fluxo de projetos.'
)
TIMEOUT_MS = 30_000
logger = logging.getLogger(__name__)

ROLE_LABELS = {
    'translator': 'Tradutor',
    'reviewer': 'Revisor / QA (Equipe)',
    'employee': 'Equipe interna',
    'admin': 'Administrador',
}


class AgentNotConfiguredError(Exception):
    """GEMINI_API_KEY não configurada no .env."""


class AgentUnavailableError(Exception):
    """O Gemini não respondeu: fora do ar, sobrecarregado ou demorou demais."""


def _serialize_stage_definition(index: int, stage: dict) -> dict:
    role = stage.get('role', '')
    return {
        'ordem': index + 1,
        'id': stage.get('id'),
        'titulo': stage.get('title'),
        'descricao': stage.get('description', ''),
        'responsavel_papel': role,
        'responsavel_descricao': ROLE_LABELS.get(role, role),
    }


def listar_modelos_fluxo() -> list[dict]:
    """Lista todos os modelos (templates) de fluxo de projeto disponíveis no sistema e o resumo de suas etapas."""
    modelos = []
    for template_id, template in TEMPLATES.items():
        stages = template.get('stages', [])
        modelos.append(
            {
                'template_id': template_id,
                'titulo': template.get('title', template_id),
                'descricao': template.get('description', ''),
                'total_etapas': len(stages),
                'sequencia_etapas': [s.get('title') for s in stages],
            }
        )
    return modelos


def explicar_fluxo_completo(template_id: str) -> dict:
    """Explica por inteiro um modelo de fluxo de projeto específico (ex: tep, mtpe, localization, documentary, subtitling), detalhando todas as suas etapas em ordem."""
    key = template_id.strip().lower()
    template = TEMPLATES.get(key)
    if not template:
        for tid, item in TEMPLATES.items():
            if key in tid.lower() or key in item.get('title', '').lower():
                template = item
                key = tid
                break
    if not template:
        return {
            'encontrado': False,
            'erro': f"Modelo de fluxo '{template_id}' não encontrado.",
            'modelos_disponiveis': list(TEMPLATES.keys()),
        }

    etapas = [_serialize_stage_definition(i, s) for i, s in enumerate(template.get('stages', []))]
    return {
        'encontrado': True,
        'template_id': key,
        'titulo': template.get('title', key),
        'descricao': template.get('description', ''),
        'total_etapas': len(etapas),
        'etapas': etapas,
        'regras_gerais': (
            'As etapas são sequenciais: uma etapa só pode ser concluída após a conclusão das anteriores. '
            'Etapas de tradução são concluídas pelo tradutor responsável (ou automaticamente ao enviar a entrega); '
            'etapas de revisão/QA pertencem à equipe interna. Qualquer etapa ativa pode ser bloqueada com justificativa e retomada depois.'
        ),
    }


def explicar_etapa_fluxo(template_id: str, etapa: str) -> dict:
    """Explica em detalhes uma etapa específica dentro de um modelo de fluxo de projeto."""
    key = template_id.strip().lower()
    template = TEMPLATES.get(key)
    if not template:
        return {
            'encontrado': False,
            'erro': f"Modelo de fluxo '{template_id}' não encontrado.",
            'modelos_disponiveis': list(TEMPLATES.keys()),
        }

    termo = etapa.strip().lower()
    stages = template.get('stages', [])
    for index, stage in enumerate(stages):
        if termo in stage.get('id', '').lower() or termo in stage.get('title', '').lower():
            anterior = stages[index - 1]['title'] if index > 0 else 'Início do fluxo (nenhuma)'
            proxima = stages[index + 1]['title'] if index + 1 < len(stages) else 'Fim do fluxo (conclusão)'
            return {
                'encontrado': True,
                'modelo': template.get('title', key),
                'etapa': _serialize_stage_definition(index, stage),
                'etapa_anterior': anterior,
                'proxima_etapa': proxima,
            }

    return {
        'encontrado': False,
        'erro': f"Etapa '{etapa}' não encontrada no modelo '{key}'.",
        'etapas_validas': [{'id': s.get('id'), 'titulo': s.get('title')} for s in stages],
    }


def _build_user_tools(user: dict | None) -> list:
    """Monta a lista de ferramentas do agente, habilitando consultas e ações se houver usuário autenticado."""

    def listar_tarefas_fluxo() -> dict:
        """Lista as tarefas/projetos acessíveis ao usuário atual com o status e progresso do fluxo de cada uma."""
        if not user:
            return {'ok': False, 'erro': 'Usuário não autenticado para listar tarefas.'}
        with database() as session:
            stmt = (
                select(
                    Service.id,
                    Service.title,
                    Service.status,
                    Service.source,
                    Service.target,
                    Service.deadline,
                    ServiceWorkflow.template_id,
                    ServiceWorkflow.stages,
                    ServiceWorkflow.revision,
                )
                .outerjoin(ServiceWorkflow, ServiceWorkflow.service_id == Service.id)
                .order_by(Service.created_at.desc())
                .limit(20)
            )
            if user.get('role') not in ('employee', 'admin'):
                stmt = stmt.where(Service.translator_id == user['id'])

            rows = session.execute(stmt).mappings().all()
            tarefas = []
            for row in rows:
                stages = row['stages'] or []
                progress = round(sum(s.get('status') == 'completed' for s in stages) / len(stages) * 100) if stages else None
                etapa_atual = next(
                    (s.get('stageId') for s in stages if s.get('status') in ('current', 'blocked')),
                    None,
                )
                tarefas.append(
                    {
                        'task_id': row['id'],
                        'titulo': row['title'],
                        'status_servico': row['status'],
                        'idioma': f"{row['source']} -> {row['target']}".strip(' ->'),
                        'prazo': row['deadline'],
                        'possui_workflow': row['template_id'] is not None,
                        'template_id': row['template_id'],
                        'progresso_percentual': progress,
                        'etapa_atual': etapa_atual,
                        'revisao': row['revision'],
                    }
                )
            return {'ok': True, 'tarefas': tarefas}

    def consultar_fluxo_tarefa(task_id: str) -> dict:
        """Consulta o andamento detalhado do fluxo de etapas de uma tarefa/projeto específico pelo seu task_id."""
        if not user:
            return {'ok': False, 'erro': 'Usuário não autenticado para consultar tarefas.'}
        try:
            with database() as session:
                service = read_service(session, task_id.strip())
                ensure_task_access(service, user)
                wf = workflow_record(session, service['id'])
                if not wf:
                    return {
                        'ok': True,
                        'task_id': service['id'],
                        'titulo': service['title'],
                        'possui_workflow': False,
                        'mensagem': 'Esta tarefa ainda não possui um workflow atribuído.',
                    }
                return {
                    'ok': True,
                    'task_id': service['id'],
                    'titulo': service['title'],
                    'possui_workflow': True,
                    'template_id': wf['templateId'],
                    'modelo_titulo': wf['definition'].get('title'),
                    'progresso_percentual': wf['progress'],
                    'bloqueio': wf['blocker'],
                    'revisao': wf['revision'],
                    'etapas': wf['stages'],
                }
        except HTTPException as exc:
            return {'ok': False, 'erro': exc.detail}

    def atribuir_fluxo_tarefa(task_id: str, template_id: str, reviewer_id: str | None = None) -> dict:
        """Atribui um modelo de fluxo (tep, mtpe, localization, documentary ou subtitling) a uma tarefa. Apenas equipe/admin."""
        if not user:
            return {'ok': False, 'erro': 'Usuário não autenticado para executar ações no fluxo.'}
        if user.get('role') not in ('employee', 'admin'):
            return {'ok': False, 'erro': 'Apenas membros da equipe ou administradores podem atribuir um workflow.'}
        key = template_id.strip().lower()
        if key not in TEMPLATES:
            return {
                'ok': False,
                'erro': f"Template '{template_id}' inválido. Opções: {list(TEMPLATES.keys())}.",
            }
        try:
            with database() as session:
                service = read_service(session, task_id.strip(), for_update=True)
                wf = assign_workflow(session, service, key, user, reviewer_id or None)
                return {
                    'ok': True,
                    'mensagem': f"Fluxo '{wf['definition'].get('title', key)}' atribuído com sucesso.",
                    'progresso_percentual': wf['progress'],
                    'etapas': wf['stages'],
                }
        except HTTPException as exc:
            return {'ok': False, 'erro': exc.detail}

    def atualizar_etapa_fluxo(task_id: str, stage_id: str, acao: str, nota: str = '') -> dict:
        """Executa uma ação em uma etapa do fluxo de uma tarefa: 'complete' (concluir), 'block' (bloquear) ou 'resume' (retomar)."""
        if not user:
            return {'ok': False, 'erro': 'Usuário não autenticado para alterar etapas do fluxo.'}
        acao_norm = acao.strip().lower()
        if acao_norm not in ('complete', 'block', 'resume'):
            return {'ok': False, 'erro': "Ação inválida. Use 'complete', 'block' ou 'resume'."}
        try:
            with database() as session:
                service = read_service(session, task_id.strip(), for_update=True)
                ensure_task_access(service, user)
                atual = workflow_record(session, service['id'])
                if not atual:
                    return {'ok': False, 'erro': 'Esta tarefa ainda não possui um workflow atribuído.'}
                command = StageUpdate(
                    expectedRevision=atual['revision'],
                    action=acao_norm,
                    note=nota.strip() if nota else '',
                )
                wf = update_stage(session, service, stage_id.strip(), command, user)
                return {
                    'ok': True,
                    'mensagem': f"Ação '{acao_norm}' executada na etapa '{stage_id}'.",
                    'progresso_percentual': wf['progress'],
                    'bloqueio': wf['blocker'],
                    'etapas': wf['stages'],
                }
        except HTTPException as exc:
            return {'ok': False, 'erro': exc.detail}

    return [
        listar_modelos_fluxo,
        explicar_fluxo_completo,
        explicar_etapa_fluxo,
        listar_tarefas_fluxo,
        consultar_fluxo_tarefa,
        atribuir_fluxo_tarefa,
        atualizar_etapa_fluxo,
    ]


def responder(pergunta: str, user: dict | None = None) -> str:
    """Recebe a pergunta/comando do usuário e devolve a resposta do agente em texto."""
    api_key = os.getenv('GEMINI_API_KEY', '')
    if not api_key:
        raise AgentNotConfiguredError('O agente de fluxo de projeto não foi configurado.')
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=TIMEOUT_MS))
    tools = _build_user_tools(user)
    try:
        chat = client.chats.create(
            model=os.getenv('GEMINI_MODEL', 'gemini-3.1-flash-lite'),
            config=types.GenerateContentConfig(system_instruction=INSTRUCTIONS, tools=tools),
        )
        response = chat.send_message(pergunta)
    except Exception as error:
        logger.exception('Falha ao consultar o agente de fluxo de projeto')
        raise AgentUnavailableError('O agente de fluxo de projeto está indisponível no momento.') from error
    return response.text or 'Não consegui gerar uma resposta agora.'