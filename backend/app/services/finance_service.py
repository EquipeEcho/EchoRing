"""Company finance overview for the administrator: balance, projects and translator costs."""

from decimal import Decimal


def _money(value):
    return float(round(value, 2))


def finance_overview(projects, translators):
    """Junta receita, custo, saldo, lucro médio, projetos mais lucrativos e gasto por tradutor."""
    approved = [item for item in projects if item['approved']]
    revenue = sum((item['revenue'] for item in approved), Decimal('0'))
    cost = sum((item['cost'] for item in projects), Decimal('0'))
    ranking = sorted(approved, key=lambda item: item['profit'], reverse=True)
    translator_list = [
        {'id': item['id'], 'name': item['name'], 'total': _money(item['total']), 'tasks': item['tasks']}
        for item in translators
    ]
    return {
        'revenue': _money(revenue),
        'cost': _money(cost),
        'balance': _money(revenue - cost),
        'approvedProjects': len(approved),
        'averageProfit': _money(sum((item['profit'] for item in approved), Decimal('0')) / len(approved)) if approved else 0.0,
        'projects': [
            {
                'id': item['id'], 'title': item['title'], 'client': item['client'],
                'revenue': _money(item['revenue']), 'cost': _money(item['cost']), 'profit': _money(item['profit']),
            }
            for item in ranking
        ],
        'translators': translator_list,
        'topTranslator': translator_list[0] if translator_list else None,
    }
