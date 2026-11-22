"""Statistics sub-agent tools: numbers come from the database and are computed in Python."""

import logging

from app.database_pg import database
from app.repositories import finance_store
from app.services import statistics_service as stats

logger = logging.getLogger(__name__)


def _projects():
    with database() as session:
        return finance_store.project_finances(session)


def _safe(build):
    try:
        return {'status': 'success', **build()}
    except Exception:  # noqa: BLE001 — o agente recebe um erro estável em vez de uma exceção
        logger.exception('Falha ao calcular estatística')
        return {'status': 'error', 'error_message': 'Não foi possível consultar os dados financeiros agora.'}


def resumo_lucro() -> dict:
    """Estatística descritiva dos projetos aprovados: receita, custo, lucro total, lucro médio, mediana e margem ponderada."""
    return _safe(lambda: stats.profit_summary(_projects()))


def tendencia_lucro() -> dict:
    """Lucro de cada mês, tendência por regressão linear (alta, queda ou estável) e previsão de lucro do próximo mês."""
    return _safe(lambda: stats.profit_trend(_projects()))


def valor_esperado_orcamento() -> dict:
    """Probabilidade de um orçamento enviado ser aprovado e o valor esperado de receita por orçamento."""
    return _safe(lambda: stats.quote_expected_value(_projects()))


def gastos_tradutores() -> dict:
    """Quanto a empresa pagou a cada tradutor, do maior para o menor valor, com o número de tarefas."""
    def build():
        with database() as session:
            rows = finance_store.translator_costs(session)
        return {'translators': [
            {'name': row['name'], 'total': float(row['total']), 'tasks': row['tasks']} for row in rows
        ]}
    return _safe(build)
