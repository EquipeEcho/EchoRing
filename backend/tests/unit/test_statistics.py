"""Statistics over in-memory project finances, without a database."""

import unittest
from datetime import datetime
from decimal import Decimal

from app.services import statistics_service as stats


def project(month, revenue, cost, approved=True, quoted=True):
    return {
        'createdAt': datetime(2026, month, 10), 'approved': approved, 'quoted': quoted,
        'revenue': Decimal(revenue), 'cost': Decimal(cost), 'profit': Decimal(revenue) - Decimal(cost),
    }


class StatisticsTests(unittest.TestCase):
    def setUp(self):
        self.projects = [
            project(8, '100', '40'),
            project(9, '300', '100'),
            project(10, '500', '200'),
            project(10, '0', '0', approved=False),
            project(10, '0', '0', approved=False, quoted=False),
        ]

    def test_weighted_mean_and_regression(self):
        """Confere a média ponderada e uma reta conhecida (y = 2x + 1)."""
        self.assertEqual(stats.weighted_mean([10, 20], [1, 3]), 17.5)
        self.assertEqual(stats.weighted_mean([], []), 0.0)
        self.assertEqual(stats.linear_regression([0, 1, 2], [1, 3, 5]), (2.0, 1.0))

    def test_profit_summary_uses_only_approved_projects(self):
        """Ignora projetos não aprovados e calcula média, mediana e margem ponderada."""
        summary = stats.profit_summary(self.projects)
        self.assertEqual(summary['projects'], 3)
        self.assertEqual(summary['profit'], 560.0)
        self.assertEqual(summary['mean_profit'], 186.67)
        self.assertEqual(summary['median_profit'], 200.0)
        self.assertEqual(summary['weighted_margin'], round(560 / 900, 4))

    def test_profit_trend_forecasts_next_month(self):
        """Lucros de 60, 200 e 300 por mês indicam alta e preveem o mês seguinte."""
        trend = stats.profit_trend(self.projects)
        self.assertEqual([item['month'] for item in trend['months']], ['2026-08', '2026-09', '2026-10'])
        self.assertEqual(trend['slope'], 120.0)
        self.assertEqual(trend['direction'], 'alta')
        self.assertEqual(trend['next_month_forecast'], 426.67)

    def test_expected_value_of_a_quote(self):
        """Três de quatro orçamentos aprovados, com receita média de 300."""
        result = stats.quote_expected_value(self.projects)
        self.assertEqual(result['approval_probability'], 0.75)
        self.assertEqual(result['mean_approved_revenue'], 300.0)
        self.assertEqual(result['expected_value'], 225.0)

    def test_empty_data_does_not_fail(self):
        """Sem projetos, todas as funções devolvem zeros em vez de erro."""
        self.assertEqual(stats.profit_summary([])['projects'], 0)
        self.assertEqual(stats.profit_trend([])['direction'], 'sem dados')
        self.assertEqual(stats.quote_expected_value([])['expected_value'], 0.0)
