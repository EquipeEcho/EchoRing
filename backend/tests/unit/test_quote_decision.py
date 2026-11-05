"""Exercise public quote authorization and decisions with a transaction test double."""
import hashlib
from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.routes import requests_routes
from main import app


class QuoteDecisionTests(unittest.TestCase):
    def setUp(self):
        self.token = 'personal-quote-token-with-at-least-thirty-two-characters'
        self.record = dict(id='SOL-MULTI', title='Manual', service='Tradução', source='English',
            target='Português (Brasil)', targets=['Português (Brasil)', 'Espanhol (Espanha)'],
            status='Orçamento enviado', quoteResponseTokenDigest=hashlib.sha256(self.token.encode()).hexdigest(),
            quoteResponseExpiresAt=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            quote=dict(amount='300.30', delivery='2099-01-10', message='', items=[
                dict(target='Português (Brasil)', amount='100.10', delivery='2099-01-09'),
                dict(target='Espanhol (Espanha)', amount='200.20', delivery='2099-01-10')]))
        self.connection = MagicMock()
        self.database = patch.object(requests_routes, 'database')
        self.database.start().return_value.__enter__.return_value = self.connection
        self.reader = patch.object(requests_routes, '_request_for_quote', return_value=self.record)
        self.reader.start()
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.addCleanup(self.reader.stop)
        self.addCleanup(self.database.stop)

    def decide(self, **changes):
        return self.client.post('/quotes/ORC-MULTI/decision', json={
            'token': self.token, 'decision': 'approve', 'targets': ['Portuguese'], **changes})

    def test_client_cannot_override_the_approved_amount(self):
        response = self.decide(approvedAmount='0.01')
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['approvedTargets'], ['Português (Brasil)'])
        self.assertEqual(response.json()['approvedAmount'], '100.10')
        self.assertEqual(self.record['quote']['amount'], '300.30')
        self.assertEqual(self.record['approvedAmount'], '100.10')
        self.assertTrue(self.connection.execute.called)
        self.assertEqual(self.decide().status_code, 409)

    def test_invalid_token_cannot_read_or_approve_a_proposal(self):
        self.assertEqual(self.decide(token='x' * 48).status_code, 403)
        response = self.client.post('/quotes/ORC-MULTI/preview', json={'token': 'x' * 48})
        self.assertEqual(response.status_code, 403)
        self.connection.execute.assert_not_called()

    def test_expired_link_rejects_preview_and_decision(self):
        self.record['quoteResponseExpiresAt'] = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
        self.assertEqual(self.decide().status_code, 410)
        self.assertEqual(self.client.post('/quotes/ORC-MULTI/preview', json={'token': self.token}).status_code, 410)
        self.connection.execute.assert_not_called()

    def test_invalid_language_selection_does_not_change_the_order(self):
        for targets in (None, [], ['Portuguese', 'pt-BR'], ['French']):
            with self.subTest(targets=targets):
                self.assertEqual(self.decide(targets=targets).status_code, 422)
        self.assertEqual(self.record['status'], 'Orçamento enviado')
        self.connection.execute.assert_not_called()

    def test_refusal_has_no_contracted_languages_or_value(self):
        response = self.decide(decision='decline', targets=[])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['approvedTargets'], [])
        self.assertEqual(response.json()['approvedAmount'], '0')

    def test_preview_returns_no_customer_contact_or_authorization_fields(self):
        self.record['email'] = 'private@example.test'
        response = self.client.post('/quotes/ORC-MULTI/preview', json={'token': self.token})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {'id', 'title', 'service', 'source', 'targets', 'quote'})
        self.connection.execute.assert_not_called()
