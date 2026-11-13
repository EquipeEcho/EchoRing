"""Gemini agent that answers company statistics questions using calculated tools."""

import os

from google import genai
from google.genai import types

from app.database_pg import database
from app.repositories import finance_store
from app.services import statistics_service as stats

INSTRUCTIONS = (
    'Você é o agente de estatística da Aliança Traduções. Responda em português, '
    'de forma curta e clara, para o administrador da empresa. Use sempre as ferramentas '
    'para obter os números: nunca invente valores nem faça contas por conta própria. '
    'Valores em reais devem aparecer como R$ 1.234,56. Se a pergunta não for sobre '
    'finanças ou estatística da empresa, diga que só responde sobre esse assunto.'
)


class AgentNotConfiguredError(Exception):
    """GEMINI_API_KEY não configurada no .env."""


def _projects():
    with database() as connection:
        return finance_store.project_finances(connection)


def resumo_lucro() -> dict:
    """Estatística descritiva dos projetos aprovados: receita, custo, lucro total, lucro médio, mediana e margem ponderada."""
    return stats.profit_summary(_projects())


def tendencia_lucro() -> dict:
    """Lucro de cada mês, tendência por regressão linear (alta, queda ou estável) e previsão de lucro do próximo mês."""
    return stats.profit_trend(_projects())


def valor_esperado_orcamento() -> dict:
    """Probabilidade de um orçamento enviado ser aprovado e o valor esperado de receita por orçamento."""
    return stats.quote_expected_value(_projects())


def gastos_tradutores() -> list[dict]:
    """Quanto a empresa pagou a cada tradutor, do maior para o menor valor, com o número de tarefas."""
    with database() as connection:
        rows = finance_store.translator_costs(connection)
    return [{'name': row['name'], 'total': float(row['total']), 'tasks': row['tasks']} for row in rows]


TOOLS = [resumo_lucro, tendencia_lucro, valor_esperado_orcamento, gastos_tradutores]


def responder(pergunta):
    """Recebe a pergunta do administrador e devolve a resposta do agente em texto."""
    api_key = os.getenv('GEMINI_API_KEY', '')
    if not api_key:
        raise AgentNotConfiguredError('O agente de estatística não foi configurado.')
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=os.getenv('GEMINI_MODEL', 'gemini-3.1-flash-lite'),
        contents=pergunta,
        config=types.GenerateContentConfig(system_instruction=INSTRUCTIONS, tools=TOOLS),
    )
    return response.text or 'Não consegui gerar uma resposta agora.'
