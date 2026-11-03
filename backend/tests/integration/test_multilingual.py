"""One commercial order, partial approval, independent offers and deliveries."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Barrier
from unittest.mock import patch

from fastapi.testclient import TestClient
from psycopg.errors import UniqueViolation

from app.database_pg import database, now
from app.routes import requests_routes
from app.services.email import workflow_service
from main import app
from tests.support.portal_test_case import PortalTestCase


class MultilingualTests(PortalTestCase):
    def test_upgrade_preserves_legacy_records_and_replaces_single_request_uniqueness(self):
        service_request = self.create()
        offer_request = self.create()
        account, _ = self.translator_session()
        deadline = (datetime.now(timezone.utc) + timedelta(days=10)).date().isoformat()
        expires = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        with database() as connection:
            staff_id = connection.execute("SELECT id FROM users WHERE email = 'staff@example.test'").fetchone()['id']
            connection.execute('''INSERT INTO services (id, request_id, title, translator_id, status, target, created_at)
                VALUES ('LEGACY-TASK', ?, 'Legacy manual', ?, 'Em andamento', ?, ?)''',
                (service_request, account['id'], self.intake['target'], now()))
            connection.execute('''INSERT INTO job_offers (id, request_id, translator_id, created_by,
                compensation, deadline, expires_at, description, volume)
                VALUES ('LEGACY-OFFER', ?, ?, ?, 50, ?, ?, 'Legacy description', '10 pages')''',
                (offer_request, account['id'], staff_id, deadline, expires))
            connection.execute("UPDATE requests SET data = data - 'targets' WHERE id IN (?, ?)", (service_request, offer_request))
            # Reconstruct the pre-003 schema only inside this test's temporary schema.
            connection.execute('DROP INDEX services_request_target')
            connection.execute('CREATE UNIQUE INDEX services_request_id ON services(request_id) WHERE request_id IS NOT NULL')
            connection.execute('DROP INDEX job_offers_pending_recipient')
            connection.execute('DROP INDEX job_offers_one_acceptance')
            connection.execute('ALTER TABLE job_offers DROP COLUMN target')
            connection.execute("CREATE UNIQUE INDEX job_offers_pending_recipient ON job_offers(request_id, translator_id) WHERE status = 'pending'")
            connection.execute("CREATE UNIQUE INDEX job_offers_one_acceptance ON job_offers(request_id) WHERE status = 'accepted'")
            connection.execute("DELETE FROM schema_migrations WHERE version = '003_multilingual'")

        # A new connection uses the real initializer and applies the pending migration.
        with database() as connection:
            service = connection.execute("SELECT * FROM services WHERE id = 'LEGACY-TASK'").fetchone()
            offer = connection.execute("SELECT * FROM job_offers WHERE id = 'LEGACY-OFFER'").fetchone()
            self.assertEqual((service['title'], service['status'], service['target']), ('Legacy manual', 'Em andamento', self.intake['target']))
            self.assertEqual((offer['description'], offer['status'], offer['target']), ('Legacy description', 'pending', self.intake['target']))
            self.assertEqual(connection.execute("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = '003_multilingual'").fetchone()['count'], 1)
            self.assertIsNone(connection.execute("SELECT to_regclass('services_request_id') AS index").fetchone()['index'])
            connection.execute('''INSERT INTO services (id, request_id, title, translator_id, status, target, created_at)
                VALUES ('SECOND-LANGUAGE', ?, 'Spanish manual', ?, 'Tradutor atribuído', 'Spanish', ?)''',
                (service_request, account['id'], now()))
        with self.assertRaises(UniqueViolation):
            with database() as connection:
                connection.execute('''INSERT INTO services (id, request_id, title, translator_id, status, target, created_at)
                    VALUES ('DUPLICATE-LANGUAGE', ?, 'Duplicate', ?, 'Tradutor atribuído', ?, ?)''',
                    (service_request, account['id'], self.intake['target'], now()))
        original = self.client.get(f'/requests/{service_request}', headers=self.headers).json()
        self.assertEqual(original['attachments'], self.intake['attachments'])

    def prepare(self, approved=None):
        self.emails = self.enterContext(patch.object(workflow_service, 'send_email'))
        self.targets = ['Português (Brasil)', 'Espanhol (Espanha)', 'Francês (França)']
        self.intake.update(target=self.targets[0], targets=self.targets)
        self.quote = dict(amount='600.30', delivery='2099-01-10', message='Tradução por idioma.', items=[
            dict(target=target, amount=amount, delivery='2099-01-10')
            for target, amount in zip(self.targets, ['100.10', '200.20', '300.00'])])
        self.request_id = self.create()
        self.save_quote(self.request_id)
        with patch.object(requests_routes, 'deliver_quote') as email:
            response = self.client.post(f'/requests/{self.request_id}/send-quote', headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.quote_id = response.json()['quote']['id']
        self.response_token = email.call_args.args[1]
        if approved:
            response = self.decision(approved)
            self.assertEqual(response.status_code, 200, response.text)

    def decision(self, targets):
        return self.client.post(f'/quotes/{self.quote_id}/decision', json=dict(
            token=self.response_token, decision='approve', targets=targets))

    def accounts(self):
        first, first_headers = self.translator_session()
        second, _, second_headers = self.invited_translator()
        profile = self.complete_profile()
        profile['languages'].append(dict(name='Espanhol (Espanha)', level='Fluente'))
        for headers in (first_headers, second_headers):
            self.assertEqual(self.client.put('/translator-profile/me', headers=headers, json=profile).status_code, 200)
        return first, first_headers, second, second_headers

    def offer(self, target, ids, expected=201):
        current = datetime.now(timezone.utc)
        terms = dict(target=target, translatorIds=ids, compensation='50.10',
                     deadline=(current + timedelta(days=10)).date().isoformat(),
                     expiresAt=(current + timedelta(days=2)).isoformat(),
                     description='Traduzir o documento.', volume='10 páginas')
        result = self.client.post(f'/requests/{self.request_id}/offers', headers=self.headers, json=terms)
        self.assertEqual(result.status_code, expected, result.text)
        return result.json()

    def detail(self):
        return self.client.get(f'/requests/{self.request_id}', headers=self.headers).json()

    def test_preview_and_partial_approval_preserve_original_quote(self):
        self.prepare()
        preview = f'/quotes/{self.quote_id}/preview'
        self.assertEqual(self.client.post(preview, json={'token': 'x' * 48}).status_code, 403)
        result = self.client.post(preview, json={'token': self.response_token})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['targets'], self.targets)
        self.assertNotIn('email', result.json())
        for targets in ([], ['Klingon'], ['Portuguese', 'pt-BR']):
            self.assertEqual(self.decision(targets).status_code, 422)
        approved = self.decision(self.targets[:2])
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.json()['approvedAmount'], '300.30')
        self.assertEqual(self.detail()['quote']['amount'], '600.30')
        self.assertEqual(self.detail()['approvedTargets'], self.targets[:2])
        self.assertEqual(self.decision(self.targets).status_code, 409)
        first, _, _, _ = self.accounts()
        self.offer(self.targets[2], [first['id']], expected=422)
        result = self.client.post(f'/requests/{self.request_id}/assign', headers=self.headers,
                                 json=dict(target=self.targets[2], translatorId=first['id'], deadline='2099-01-10'))
        self.assertEqual(result.status_code, 422)

    def test_acceptance_cancels_only_competing_offers_for_the_same_language(self):
        self.prepare(['Português (Brasil)', 'Espanhol (Espanha)'])
        first, first_headers, second, second_headers = self.accounts()
        portuguese = self.offer(self.targets[0], [first['id'], second['id']])
        spanish = self.offer(self.targets[1], [second['id']])[0]
        self.assertEqual(self.client.post(f"/opportunities/{portuguese[0]['id']}/accept", headers=first_headers).status_code, 200)
        inbox = self.client.get('/opportunities', headers=second_headers).json()
        self.assertEqual(next(item for item in inbox if item['id'] == spanish['id'])['status'], 'pending')
        self.assertEqual(next(item for item in inbox if item['id'] == portuguese[1]['id'])['status'], 'cancelled')
        accepted = self.client.post(f"/opportunities/{spanish['id']}/accept", headers=second_headers)
        self.assertEqual(accepted.status_code, 200, accepted.text)
        tasks = self.detail()['tasks']
        self.assertEqual(len(tasks), 2)
        self.assertEqual({item['translator']['id'] for item in tasks}, {first['id'], second['id']})
        self.offer(self.targets[0], [second['id']], expected=409)
        clients = self.client.get('/clients', headers=self.headers).json()
        projects = next(client for client in clients if client['email'] == self.intake['email'])['projects']
        self.assertEqual(len(projects), 1)
        self.assertEqual(projects[0]['id'], self.request_id)

        for index, (target, headers) in enumerate(zip(self.targets, [first_headers, second_headers])):
            task = next(item for item in tasks if item['target'] == target)
            self.assertEqual(self.client.post(f"/tasks/{task['id']}/start", headers=headers).status_code, 200)
            delivery = self.client.post(f"/tasks/{task['id']}/deliveries", headers=headers,
                                       files={'file': (f'translation-{index}.txt', b'Translated document', 'text/plain')})
            self.assertEqual(delivery.status_code, 201, delivery.text)
            reviewed = self.client.post(f"/deliveries/{delivery.json()['id']}/review", headers=self.headers, json={'decision': 'approve'})
            self.assertEqual(reviewed.status_code, 200, reviewed.text)
            self.assertEqual(self.detail()['status'], 'Entregue' if index else 'Em andamento')
        self.assertEqual(len(self.client.get('/tasks', headers=first_headers).json()), 1)
        self.assertEqual(len(self.client.get('/tasks', headers=second_headers).json()), 1)
        clients = self.client.get('/clients', headers=self.headers).json()
        projects = next(client for client in clients if client['email'] == self.intake['email'])['projects']
        self.assertEqual(len(projects), 1)
        self.assertEqual(projects[0]['status'], 'Entregue')

    def test_parallel_acceptances_allow_one_task_for_each_language(self):
        self.prepare(['Português (Brasil)', 'Espanhol (Espanha)'])
        first, first_headers, second, second_headers = self.accounts()
        offers = [self.offer(target, [account['id']])[0] for target, account in zip(self.targets, [first, second])]
        barrier = Barrier(2)
        def accept(pair):
            offer, headers = pair
            with TestClient(app) as client:
                barrier.wait(timeout=15)
                return client.post(f"/opportunities/{offer['id']}/accept", headers=headers).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(accept, zip(offers, [first_headers, second_headers])))
        self.assertEqual(results, [200, 200])
        self.assertEqual(len(self.detail()['tasks']), 2)
