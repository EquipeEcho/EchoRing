"""Financial queries: revenue, translator costs and profit per project."""

from decimal import Decimal

from app.core.translation_scope import approved_amount, approved_request, work_targets
from app.database_pg import json_data


def project_finances(connection):
    """Lista cada solicitação com a receita aprovada, o custo com tradutores e o lucro."""
    costs = {
        row['request_id']: Decimal(row['cost'])
        for row in connection.execute(
            '''SELECT request_id, COALESCE(SUM(translator_compensation), 0) AS cost
               FROM services WHERE request_id IS NOT NULL GROUP BY request_id'''
        ).fetchall()
    }
    projects = []
    for row in connection.execute('SELECT id, data, created_at FROM requests ORDER BY created_at').fetchall():
        data = json_data(row['data'])
        approved = bool(data.get('quote')) and approved_request(data)
        revenue = approved_amount(data['quote'], work_targets(data)) if approved else Decimal('0')
        cost = costs.get(row['id'], Decimal('0'))
        projects.append({
            'id': row['id'], 'title': data.get('title', ''), 'client': data.get('name', ''),
            'status': data.get('status', ''), 'createdAt': row['created_at'],
            'quoted': bool(data.get('quote')), 'approved': approved,
            'revenue': revenue, 'cost': cost, 'profit': revenue - cost,
        })
    return projects


def translator_costs(connection):
    """Soma quanto cada tradutor recebeu, do maior para o menor valor."""
    rows = connection.execute(
        '''SELECT users.id, users.name, SUM(services.translator_compensation) AS total, COUNT(*) AS tasks
           FROM services JOIN users ON users.id = services.translator_id
           WHERE services.translator_compensation IS NOT NULL
           GROUP BY users.id, users.name ORDER BY total DESC'''
    ).fetchall()
    return [{'id': row['id'], 'name': row['name'], 'total': Decimal(row['total']), 'tasks': row['tasks']} for row in rows]
