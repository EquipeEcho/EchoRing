"""Revenue, cost and profit computed from real workflow data."""

import os
from decimal import Decimal
from unittest.mock import patch

from app import database_pg as db
from app.repositories import finance_store
from tests.support.portal_test_case import PortalTestCase


class FinanceStoreTests(PortalTestCase):
    def approved_request(self):
        request_id = self.create()
        self.save_quote(request_id)
        with patch.dict(os.environ, {'AUTO_APPROVE_QUOTES': 'true'}):
            response = self.client.post(f'/requests/{request_id}/send-quote', headers=self.headers)
        self.assertEqual(response.json()['status'], 'Orçamento aprovado')
        return request_id

    def test_project_profit_uses_approved_quote_and_translator_compensation(self):
        translator, _ = self.translator_session()
        approved_id = self.approved_request()
        pending_id = self.create()
        with db.database() as connection:
            connection.execute(
                '''INSERT INTO services (id, request_id, title, translator_id, status, created_at, translator_compensation)
                   VALUES (?, ?, ?, ?, 'Entregue', ?, ?)''',
                ('TRD-FIN-1', approved_id, 'Test manual', translator['id'], db.now(), Decimal('120.00')),
            )
            projects = {item['id']: item for item in finance_store.project_finances(connection)}
            costs = finance_store.translator_costs(connection)

        self.assertEqual(projects[approved_id]['revenue'], Decimal('350.50'))
        self.assertEqual(projects[approved_id]['cost'], Decimal('120.00'))
        self.assertEqual(projects[approved_id]['profit'], Decimal('230.50'))
        self.assertFalse(projects[pending_id]['approved'])
        self.assertEqual(projects[pending_id]['revenue'], Decimal('0'))
        self.assertEqual(costs[0]['name'], 'Test Translator')
        self.assertEqual(costs[0]['total'], Decimal('120.00'))
