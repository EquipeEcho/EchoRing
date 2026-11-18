"""Tools for the project workflow ADK sub-agent."""

from contextvars import ContextVar, Token
import logging

from fastapi import HTTPException
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

logger = logging.getLogger(__name__)

_current_user: ContextVar[dict | None] = ContextVar('workflow_agent_user', default=None)

ROLE_LABELS = {
    'translator': 'Tradutor',
    'reviewer': 'Revisor / QA (Equipe)',
    'employee': 'Equipe interna',
    'admin': 'Administrador',
}


def set_current_user(user: dict | None) -> Token:
    """Define o usuário autenticado no contexto da execução atual do agente."""
    return _current_user.set(user)


def reset_current_user(token: Token) -> None:
    """Restaura o contexto de usuário após a execução do agente."""
    _current_user.reset(token)


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


def listar_modelos_fluxo() -> dict:
    """Lista todos os modelos (templates) de fluxo de projeto disponíveis no sistema e o resumo de suas etapas."""
    try:
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
        return {'status': 'success', 'modelos': modelos}
    except Exception as error:
        logger.exception('Falha ao listar modelos de fluxo')
        return {'status': 'error', 'erro': str(error)}


def explicar_fluxo_completo(template_id: str) -> dict:
    """Explica por inteiro um modelo de fluxo de projeto específico (ex: tep, mtpe, localization, documentary, subtitling), detalhando todas as suas etapas em ordem."""
    try:
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
                'status': 'error',
                'erro': f"Modelo de fluxo '{template_id}' não encontrado.",
                'modelos_disponiveis': list(TEMPLATES.keys()),
            }

        etapas = [_serialize_stage_definition(i, s) for i, s in enumerate(template.get('stages', []))]
        return {
            'status': 'success',
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
    except Exception as error:
        logger.exception('Falha ao explicar fluxo completo')
        return {'status': 'error', 'erro': str(error)}


def explicar_etapa_fluxo(template_id: str, etapa: str) -> dict:
    """Explica em detalhes uma etapa específica dentro de um modelo de fluxo de projeto."""
    try:
        key = template_id.strip().lower()
        template = TEMPLATES.get(key)
        if not template:
            return {
                'status': 'error',
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
                    'status': 'success',
                    'modelo': template.get('title', key),
                    'etapa': _serialize_stage_definition(index, stage),
                    'etapa_anterior': anterior,
                    'proxima_etapa': proxima,
                }

        return {
            'status': 'error',
            'erro': f"Etapa '{etapa}' não encontrada no modelo '{key}'.",
            'etapas_validas': [{'id': s.get('id'), 'titulo': s.get('title')} for s in stages],
        }
    except Exception as error:
        logger.exception('Falha ao explicar etapa do fluxo')
        return {'status': 'error', 'erro': str(error)}


def listar_tarefas_fluxo() -> dict:
    """Lista as tarefas/projetos acessíveis ao usuário atual com o status e progresso do fluxo de cada uma."""
    user = _current_user.get()
    if not user:
        return {'status': 'error', 'erro': 'Usuário não autenticado para listar tarefas.'}
    try:
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
            return {'status': 'success', 'tarefas': tarefas}
    except Exception as error:
        logger.exception('Falha ao listar tarefas do fluxo')
        return {'status': 'error', 'erro': str(error)}


def consultar_fluxo_tarefa(task_id: str) -> dict:
    """Consulta o andamento detalhado do fluxo de etapas de uma tarefa/projeto específico pelo seu task_id."""
    user = _current_user.get()
    if not user:
        return {'status': 'error', 'erro': 'Usuário não autenticado para consultar tarefas.'}
    try:
        with database() as session:
            service = read_service(session, task_id.strip())
            ensure_task_access(service, user)
            wf = workflow_record(session, service['id'])
            if not wf:
                return {
                    'status': 'success',
                    'task_id': service['id'],
                    'titulo': service['title'],
                    'possui_workflow': False,
                    'mensagem': 'Esta tarefa ainda não possui um workflow atribuído.',
                }
            return {
                'status': 'success',
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
        return {'status': 'error', 'erro': exc.detail}
    except Exception as error:
        logger.exception('Falha ao consultar fluxo da tarefa')
        return {'status': 'error', 'erro': str(error)}


def atribuir_fluxo_tarefa(task_id: str, template_id: str, reviewer_id: str = '') -> dict:
    """Atribui um modelo de fluxo (tep, mtpe, localization, documentary ou subtitling) a uma tarefa. Apenas equipe/admin."""
    user = _current_user.get()
    if not user:
        return {'status': 'error', 'erro': 'Usuário não autenticado para executar ações no fluxo.'}
    if user.get('role') not in ('employee', 'admin'):
        return {'status': 'error', 'erro': 'Apenas membros da equipe ou administradores podem atribuir um workflow.'}
    key = template_id.strip().lower()
    if key not in TEMPLATES:
        return {
            'status': 'error',
            'erro': f"Template '{template_id}' inválido. Opções: {list(TEMPLATES.keys())}.",
        }
    try:
        with database() as session:
            service = read_service(session, task_id.strip(), for_update=True)
            wf = assign_workflow(session, service, key, user, reviewer_id.strip() or None)
            return {
                'status': 'success',
                'mensagem': f"Fluxo '{wf['definition'].get('title', key)}' atribuído com sucesso.",
                'progresso_percentual': wf['progress'],
                'etapas': wf['stages'],
            }
    except HTTPException as exc:
        return {'status': 'error', 'erro': exc.detail}
    except Exception as error:
        logger.exception('Falha ao atribuir fluxo à tarefa')
        return {'status': 'error', 'erro': str(error)}


def atualizar_etapa_fluxo(task_id: str, stage_id: str, acao: str, nota: str = '') -> dict:
    """Executa uma ação em uma etapa do fluxo de uma tarefa: 'complete' (concluir), 'block' (bloquear) ou 'resume' (retomar)."""
    user = _current_user.get()
    if not user:
        return {'status': 'error', 'erro': 'Usuário não autenticado para alterar etapas do fluxo.'}
    acao_norm = acao.strip().lower()
    if acao_norm not in ('complete', 'block', 'resume'):
        return {'status': 'error', 'erro': "Ação inválida. Use 'complete', 'block' ou 'resume'."}
    try:
        with database() as session:
            service = read_service(session, task_id.strip(), for_update=True)
            ensure_task_access(service, user)
            atual = workflow_record(session, service['id'])
            if not atual:
                return {'status': 'error', 'erro': 'Esta tarefa ainda não possui um workflow atribuído.'}
            command = StageUpdate(
                expectedRevision=atual['revision'],
                action=acao_norm,
                note=nota.strip() if nota else '',
            )
            wf = update_stage(session, service, stage_id.strip(), command, user)
            return {
                'status': 'success',
                'mensagem': f"Ação '{acao_norm}' executada na etapa '{stage_id}'.",
                'progresso_percentual': wf['progress'],
                'bloqueio': wf['blocker'],
                'etapas': wf['stages'],
            }
    except HTTPException as exc:
        return {'status': 'error', 'erro': exc.detail}
    except Exception as error:
        logger.exception('Falha ao atualizar etapa do fluxo')
        return {'status': 'error', 'erro': str(error)}