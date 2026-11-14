"""Finance tab endpoint: access control and values from real workflow data."""

import os
from decimal import Decimal
from unittest.mock import patch

from sqlalchemy import insert

from app import database_pg as db
from app.db_models import Service
from tests.support.portal_test_case import PortalTestCase


class FinanceRouteTests(PortalTestCase):
    def admin_headers(self):
        response = self.client.post('/auth/login', json={'email': 'admin@example.test', 'password': 'admin-password-long-enough'})
        return {'Authorization': 'Bearer ' + response.json()['token']}

    def test_admin_sees_company_finances(self):
        """O administrador vê receita, custo, saldo, projetos e o tradutor mais caro."""
        translator, _ = self.translator_session()
        request_id = self.create()
        self.save_quote(request_id)
        with patch.dict(os.environ, {'AUTO_APPROVE_QUOTES': 'true'}):
            self.client.post(f'/requests/{request_id}/send-quote', headers=self.headers)
        with db.database() as session:
            session.execute(insert(Service).values(
                id='TRD-FIN-1', request_id=request_id, title='Test manual', translator_id=translator['id'],
                status='Entregue', created_at=db.to_datetime(db.now()), translator_compensation=Decimal('120.00'),
            ))

        response = self.client.get('/finance/overview', headers=self.admin_headers())
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['revenue'], 350.5)
        self.assertEqual(data['cost'], 120.0)
        self.assertEqual(data['balance'], 230.5)
        self.assertEqual(data['averageProfit'], 230.5)
        self.assertEqual(data['projects'][0]['id'], request_id)
        self.assertEqual(data['topTranslator']['name'], 'Test Translator')

    def test_only_admin_can_see_finances(self):
        """Funcionário comum e visitante sem login não acessam o financeiro."""
        self.assertEqual(self.client.get('/finance/overview', headers=self.headers).status_code, 403)
        self.assertEqual(self.client.get('/finance/overview').status_code, 401)
