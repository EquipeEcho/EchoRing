"""Financial queries: revenue, translator costs and profit per project."""

from decimal import Decimal

from sqlalchemy import func, select

from app.core.translation_scope import approved_amount, approved_request, work_targets
from app.database_pg import json_data
from app.db_models import Service, TranslationRequest, User


def project_finances(session):
    """Lista cada solicitação com a receita aprovada, o custo com tradutores e o lucro."""
    costs = {
        row.request_id: Decimal(row.cost)
        for row in session.execute(
            select(Service.request_id, func.coalesce(func.sum(Service.translator_compensation), 0).label('cost'))
            .where(Service.request_id.is_not(None))
            .group_by(Service.request_id)
        )
    }
    projects = []
    rows = session.execute(
        select(TranslationRequest.id, TranslationRequest.data, TranslationRequest.created_at)
        .order_by(TranslationRequest.created_at)
    )
    for row in rows:
        data = json_data(row.data)
        approved = bool(data.get('quote')) and approved_request(data)
        revenue = approved_amount(data['quote'], work_targets(data)) if approved else Decimal('0')
        cost = costs.get(row.id, Decimal('0'))
        projects.append({
            'id': row.id, 'title': data.get('title', ''), 'client': data.get('name', ''),
            'status': data.get('status', ''), 'createdAt': row.created_at,
            'quoted': bool(data.get('quote')), 'approved': approved,
            'revenue': revenue, 'cost': cost, 'profit': revenue - cost,
        })
    return projects


def translator_costs(session):
    """Soma quanto cada tradutor recebeu, do maior para o menor valor."""
    total = func.sum(Service.translator_compensation).label('total')
    rows = session.execute(
        select(User.id, User.name, total, func.count().label('tasks'))
        .select_from(Service)
        .join(User, User.id == Service.translator_id)
        .where(Service.translator_compensation.is_not(None))
        .group_by(User.id, User.name)
        .order_by(total.desc())
    )
    return [{'id': row.id, 'name': row.name, 'total': Decimal(row.total), 'tasks': row.tasks} for row in rows]
