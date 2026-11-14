"""Finance overview totals and rankings, without a database."""

import unittest
from decimal import Decimal

from app.services.finance_service import finance_overview


def project(project_id, revenue, cost, approved=True):
    return {
        'id': project_id, 'title': f'Projeto {project_id}', 'client': 'Cliente', 'approved': approved,
        'revenue': Decimal(revenue), 'cost': Decimal(cost), 'profit': Decimal(revenue) - Decimal(cost),
    }


class FinanceOverviewTests(unittest.TestCase):
    def test_overview_totals_and_rankings(self):
        """Calcula saldo e lucro médio e ordena projetos e tradutores do maior para o menor."""
        projects = [project('A', '100', '40'), project('B', '500', '150'), project('C', '0', '0', approved=False)]
        translators = [
            {'id': 't2', 'name': 'Bruna', 'total': Decimal('150'), 'tasks': 1},
            {'id': 't1', 'name': 'Ana', 'total': Decimal('40'), 'tasks': 1},
        ]
        overview = finance_overview(projects, translators)

        self.assertEqual(overview['revenue'], 600.0)
        self.assertEqual(overview['cost'], 190.0)
        self.assertEqual(overview['balance'], 410.0)
        self.assertEqual(overview['approvedProjects'], 2)
        self.assertEqual(overview['averageProfit'], 205.0)
        self.assertEqual([item['id'] for item in overview['projects']], ['B', 'A'])
        self.assertEqual(overview['topTranslator']['name'], 'Bruna')

    def test_empty_company(self):
        """Sem projetos nem tradutores pagos, devolve zeros e nenhum tradutor no topo."""
        overview = finance_overview([], [])
        self.assertEqual(overview['balance'], 0.0)
        self.assertEqual(overview['averageProfit'], 0.0)
        self.assertEqual(overview['projects'], [])
        self.assertIsNone(overview['topTranslator'])
