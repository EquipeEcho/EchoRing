import base64
import hashlib
import os
import smtplib
import unittest
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
import requests_api


class RequestsTests(unittest.TestCase):
    def setUp(self):
        self.schema = 'test_' + uuid.uuid4().hex
        self.environment = patch.dict(os.environ, {
            'POSTGRES_SCHEMA': self.schema,
            'ADMIN_EMAIL': 'admin@example.test', 'ADMIN_PASSWORD': 'admin-password-long-enough',
            'ADMIN_NAME': 'General Admin',
            'STAFF_EMAIL': 'staff@example.test', 'STAFF_PASSWORD': 'test-password-long-enough',
            'TRANSLATOR_EMAIL': 'translator@example.test', 'TRANSLATOR_PASSWORD': 'translator-password-long-enough',
            'TRANSLATOR_NAME': 'Test Translator',
            'SMTP_HOST': '', 'SMTP_FROM': '',
        })
        self.environment.start()
        requests_api._attempts.clear()
        self.client = TestClient(app)
        response = self.client.post('/staff/login', json={'email': 'staff@example.test', 'password': 'test-password-long-enough'})
        self.staff_user = response.json()
        self.token = self.staff_user['token']
        self.headers = {'Authorization': 'Bearer ' + self.token}
        raw = b'Test translation document'
        self.intake = {
            'name': 'Test Client', 'email': 'client@example.test', 'company': 'Test Company',
            'title': 'Test manual', 'service': 'Technical translation', 'source': 'English', 'target': 'Portuguese',
            'deadline': '', 'message': 'Please translate this document.', 'consent': True,
            'attachments': [{'name': 'sample.txt', 'size': len(raw), 'content': base64.b64encode(raw).decode()}],
        }
        self.quote = {'amount': '350,50', 'delivery': '5 business days', 'message': 'Translation and revision included.'}

    def tearDown(self):
        self.client.close()
        self.drop_schema(self.schema)
        self.environment.stop()

    def drop_schema(self, schema):
        if not schema.startswith('test_'):
            raise RuntimeError('Recusa ao remover schema que não pertence aos testes.')
        connection = requests_api.postgres_connection()
        try:
            connection.execute(requests_api.sql.SQL('DROP SCHEMA IF EXISTS {} CASCADE').format(requests_api.sql.Identifier(schema)))
            connection.commit()
        finally:
            connection.close()

    def create(self):
        result = self.client.post('/requests', json=self.intake)
        self.assertEqual(result.status_code, 201)
        return result.json()['id']

    def save_quote(self, request_id):
        result = self.client.patch('/requests/' + request_id, headers=self.headers, json={'quote': self.quote})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['status'], 'Em análise')

    def translator_session(self):
        response = self.client.post('/auth/login', json={
            'email': 'translator@example.test', 'password': 'translator-password-long-enough',
        })
        self.assertEqual(response.status_code, 200)
        session = response.json()
        with requests_api.database() as connection:
            translator = connection.execute('SELECT id FROM users WHERE email = ?', (session['email'],)).fetchone()
        return {**session, 'id': translator['id']}, {'Authorization': 'Bearer ' + session['token']}

    def create_service(self, translator_id, service_id='OS-TEST-001', status='Em andamento'):
        with requests_api.database() as connection:
            connection.execute(
                '''INSERT INTO services (id, request_id, title, translator_id, status, deadline, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (service_id, 'SOL-' + service_id, 'Test manual', translator_id, status, '2026-10-01', requests_api.now()),
            )
        return service_id

    def test_public_intake_is_persistent_and_staff_only(self):
        request_id = self.create()
        self.assertEqual(self.client.get('/requests').status_code, 401)
        self.assertEqual(self.client.get('/requests/' + request_id).status_code, 401)
        listing = self.client.get('/requests', headers=self.headers).json()
        self.assertEqual(listing[0]['id'], request_id)
        self.assertEqual(listing[0]['attachments'][0]['content'], '')
        detail = self.client.get('/requests/' + request_id, headers=self.headers).json()
        self.assertEqual(detail['attachments'], self.intake['attachments'])
        with TestClient(app) as second_client:
            self.assertEqual(second_client.get('/requests', headers=self.headers).json()[0]['id'], request_id)

    def test_translator_login_returns_role_and_cannot_access_staff_requests(self):
        response = self.client.post('/auth/login', json={'email': 'TRANSLATOR@example.test', 'password': 'translator-password-long-enough'})
        self.assertEqual(response.status_code, 200)
        session = response.json()
        self.assertEqual(session['name'], 'Test Translator')
        self.assertEqual(session['email'], 'translator@example.test')
        self.assertEqual(session['role'], 'translator')
        translator_headers = {'Authorization': 'Bearer ' + session['token']}
        self.assertEqual(self.client.get('/auth/me', headers=translator_headers).json()['role'], 'translator')
        self.assertEqual(self.client.get('/requests', headers=translator_headers).status_code, 403)
        self.assertEqual(self.client.post('/auth/logout', headers=translator_headers).status_code, 200)
        self.assertEqual(self.client.get('/auth/me', headers=translator_headers).status_code, 401)

    def test_admin_can_create_users_and_created_account_can_login(self):
        self.assertEqual(self.client.get('/users', headers=self.headers).status_code, 403)
        admin_login = self.client.post('/auth/login', json={'email': 'admin@example.test', 'password': 'admin-password-long-enough'})
        self.assertEqual(admin_login.status_code, 200)
        self.assertEqual(admin_login.json()['role'], 'admin')
        admin_headers = {'Authorization': 'Bearer ' + admin_login.json()['token']}
        self.assertEqual(self.client.get('/requests', headers=admin_headers).status_code, 200)
        self.assertGreaterEqual(len(self.client.get('/users', headers=admin_headers).json()), 3)
        new_user = {'name': 'Human Resources', 'email': 'hr@example.test', 'password': 'temporary-password-2026', 'role': 'hr'}
        created = self.client.post('/users', headers=admin_headers, json=new_user)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()['role'], 'hr')
        self.assertNotIn('password', created.json())
        self.assertEqual(self.client.post('/users', headers=admin_headers, json=new_user).status_code, 409)
        with requests_api.database() as connection:
            stored = connection.execute('SELECT password_hash FROM users WHERE email = ?', ('hr@example.test',)).fetchone()
            self.assertTrue(stored['password_hash'].startswith('pbkdf2_sha256$'))
            self.assertNotEqual(stored['password_hash'], new_user['password'])
        hr_login = self.client.post('/auth/login', json={'email': 'hr@example.test', 'password': new_user['password']})
        self.assertEqual(hr_login.status_code, 200)
        self.assertEqual(hr_login.json()['role'], 'hr')
        hr_headers = {'Authorization': 'Bearer ' + hr_login.json()['token']}
        self.assertEqual(self.client.get('/users', headers=hr_headers).status_code, 403)
        self.assertEqual(self.client.post('/users', headers=admin_headers, json={**new_user, 'email': 'short@example.test', 'password': 'short'}).status_code, 422)
        self.assertEqual(self.client.post('/users', headers=admin_headers, json={**new_user, 'email': 'other@example.test', 'role': 'admin'}).status_code, 422)

    def test_rejects_invalid_consent_email_languages_and_documents(self):
        for changes in [{'consent': False}, {'email': 'bad\r\nBcc: example@test.local'}, {'target': 'English'}, {'name': '   '}, {'attachments': [{'name': 'fake.pdf', 'size': 3, 'content': 'YWJj'}]}, {'attachments': [{'name': '../sample.txt', 'size': 3, 'content': 'YWJj'}]}]:
            with self.subTest(changes=changes):
                self.assertEqual(self.client.post('/requests', json={**self.intake, **changes}).status_code, 422)
        self.assertEqual(self.client.post('/requests', content=b'x' * (8 * 1024 * 1024 + 1), headers={'Content-Type': 'application/json'}).status_code, 413)

    def test_quote_draft_survives_missing_smtp_and_failed_delivery(self):
        request_id = self.create()
        self.save_quote(request_id)
        with patch.object(requests_api, 'deliver_quote', wraps=requests_api.deliver_quote):
            self.assertEqual(self.client.post('/requests/' + request_id + '/send-quote', headers=self.headers).status_code, 503)
        with patch.object(requests_api, 'deliver_quote', side_effect=smtplib.SMTPException('provider unavailable')):
            self.assertEqual(self.client.post('/requests/' + request_id + '/send-quote', headers=self.headers).status_code, 502)
        detail = self.client.get('/requests/' + request_id, headers=self.headers).json()
        self.assertEqual({key: detail['quote'][key] for key in self.quote}, self.quote)
        self.assertEqual(detail['status'], 'Em análise')
        self.assertNotIn('emailSentAt', detail)

    def test_successful_delivery_marks_sent_and_prevents_duplicate_and_edits(self):
        request_id = self.create()
        self.save_quote(request_id)
        with patch.object(requests_api, 'deliver_quote') as delivery:
            result = self.client.post('/requests/' + request_id + '/send-quote', headers=self.headers)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json()['status'], 'Orçamento enviado')
            self.assertIn('emailSentAt', result.json())
            self.assertEqual(self.client.post('/requests/' + request_id + '/send-quote', headers=self.headers).status_code, 409)
            delivery.assert_called_once()
        self.assertEqual(self.client.patch('/requests/' + request_id, headers=self.headers, json={'quote': self.quote}).status_code, 409)

    def test_smtp_uses_tls_and_sends_to_request_email(self):
        data = {**self.intake, 'id': 'SOL-TEST', 'quote': self.quote}
        with patch.dict(os.environ, {'SMTP_HOST': 'smtp.example.test', 'SMTP_FROM': 'staff@example.test', 'SMTP_SECURITY': 'starttls'}), patch.object(requests_api.smtplib, 'SMTP') as smtp:
            requests_api.deliver_quote(data)
            connection = smtp.return_value.__enter__.return_value
            connection.starttls.assert_called_once()
            message = connection.send_message.call_args.args[0]
            self.assertEqual(message['To'], 'client@example.test')
            self.assertIn('R$ 350,50', message.get_body(preferencelist=('plain',)).get_content())
            self.assertIn('/orcamento/', message.get_body(preferencelist=('plain',)).get_content())
            self.assertTrue(message.is_multipart())

    def test_logout_expiry_rate_limit_and_unknown_account(self):
        self.assertEqual(self.client.post('/staff/logout', headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get('/requests', headers=self.headers).status_code, 401)
        with requests_api.database() as connection:
            connection.execute('INSERT INTO sessions (digest, expires) VALUES (?, ?)', (hashlib.sha256(b'expired').hexdigest(), 0))
        self.assertEqual(self.client.get('/requests', headers={'Authorization': 'Bearer expired'}).status_code, 401)
        for _ in range(4):
            self.assertEqual(self.client.post('/staff/login', json={'email': 'wrong', 'password': 'wrong'}).status_code, 401)
        self.assertEqual(self.client.post('/staff/login', json={'email': 'wrong', 'password': 'wrong'}).status_code, 429)
        requests_api._attempts.clear()
        empty_schema = 'test_' + uuid.uuid4().hex
        with patch.dict(os.environ, {
            'POSTGRES_SCHEMA': empty_schema,
            'ADMIN_PASSWORD': '', 'STAFF_PASSWORD': '', 'TRANSLATOR_PASSWORD': '',
        }):
            self.assertEqual(self.client.post('/staff/login', json={'email': 'staff@example.test', 'password': 'test-password-long-enough'}).status_code, 401)
            self.drop_schema(empty_schema)

    def test_delivery_upload_requires_the_assigned_translator_and_valid_document(self):
        translator, translator_headers = self.translator_session()
        service_id = self.create_service(translator['id'])
        endpoint = f'/services/{service_id}/deliveries'
        document = {'file': ('translated.txt', b'Translated document', 'text/plain')}

        self.assertEqual(self.client.get('/services').status_code, 401)
        self.assertEqual(self.client.get('/services', headers=self.headers).status_code, 403)
        services = self.client.get('/services', headers=translator_headers)
        self.assertEqual(services.status_code, 200)
        self.assertEqual(services.json()[0]['id'], service_id)
        self.assertEqual(services.json()[0]['status'], 'Em andamento')
        self.assertEqual(services.json()[0]['lastVersion'], 0)
        self.assertEqual(self.client.post(endpoint, files=document).status_code, 401)
        self.assertEqual(self.client.post(endpoint, headers=self.headers, files=document).status_code, 403)
        result = self.client.post(endpoint, headers=translator_headers, files=document)
        self.assertEqual(result.status_code, 201)
        delivery = result.json()
        self.assertEqual(delivery['serviceId'], service_id)
        self.assertEqual(delivery['version'], 1)
        self.assertEqual(delivery['status'], 'Aguardando avaliação')
        self.assertEqual(delivery['translatorName'], 'Test Translator')
        self.assertNotIn('content', delivery)

        with requests_api.database() as connection:
            stored = connection.execute('SELECT content FROM deliveries WHERE id = ?', (delivery['id'],)).fetchone()
            service = connection.execute('SELECT status FROM services WHERE id = ?', (service_id,)).fetchone()
        self.assertEqual(bytes(stored['content']), b'Translated document')
        self.assertEqual(service['status'], 'Aguardando avaliação')
        assigned = self.client.get('/services', headers=translator_headers).json()[0]
        self.assertEqual(assigned['status'], 'Aguardando avaliação')
        self.assertEqual(assigned['lastVersion'], 1)
        self.assertEqual(self.client.post(endpoint, headers=translator_headers, files=document).status_code, 409)

        other_service = self.create_service('another-translator', service_id='OS-TEST-002')
        self.assertEqual(self.client.post(f'/services/{other_service}/deliveries', headers=translator_headers, files=document).status_code, 403)

    def test_delivery_upload_rejects_unsafe_or_invalid_documents(self):
        translator, translator_headers = self.translator_session()
        service_id = self.create_service(translator['id'])
        endpoint = f'/services/{service_id}/deliveries'
        invalid_documents = [
            ('../translated.txt', b'Translated document', 'text/plain'),
            ('translated.pdf', b'not a pdf', 'application/pdf'),
            ('translated.exe', b'MZ', 'application/octet-stream'),
            ('empty.txt', b'', 'text/plain'),
        ]
        for document in invalid_documents:
            with self.subTest(document=document[0]):
                response = self.client.post(endpoint, headers=translator_headers, files={'file': document})
                self.assertEqual(response.status_code, 422)

    def test_staff_review_preserves_versions_and_protects_the_file(self):
        translator, translator_headers = self.translator_session()
        service_id = self.create_service(translator['id'])
        endpoint = f'/services/{service_id}/deliveries'
        first = self.client.post(
            endpoint, headers=translator_headers,
            files={'file': ('translated-v1.txt', b'First version', 'text/plain')},
        ).json()

        self.assertEqual(self.client.get('/deliveries').status_code, 401)
        self.assertEqual(self.client.get('/deliveries', headers=translator_headers).status_code, 403)
        listing = self.client.get('/deliveries', headers=self.headers)
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()[0]['id'], first['id'])
        self.assertNotIn('content', listing.json()[0])

        file_endpoint = f"/deliveries/{first['id']}/file"
        self.assertEqual(self.client.get(file_endpoint).status_code, 401)
        self.assertEqual(self.client.get(file_endpoint, headers=translator_headers).status_code, 403)
        download = self.client.get(file_endpoint, headers=self.headers)
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.content, b'First version')
        self.assertEqual(download.headers['x-content-type-options'], 'nosniff')

        review_endpoint = f"/deliveries/{first['id']}/review"
        self.assertEqual(self.client.post(review_endpoint, headers=translator_headers, json={'decision': 'approve'}).status_code, 403)
        self.assertEqual(self.client.post(review_endpoint, headers=self.headers, json={'decision': 'request_revision'}).status_code, 422)
        adjustment = self.client.post(
            review_endpoint, headers=self.headers,
            json={'decision': 'request_revision', 'feedback': 'Revise the terminology on page two.'},
        )
        self.assertEqual(adjustment.status_code, 200)
        self.assertEqual(adjustment.json()['status'], 'Revisão solicitada')
        self.assertEqual(adjustment.json()['reviewerName'], self.staff_user['name'])
        self.assertEqual(self.client.post(review_endpoint, headers=self.headers, json={'decision': 'approve'}).status_code, 409)

        second = self.client.post(
            endpoint, headers=translator_headers,
            files={'file': ('translated-v2.txt', b'Second version', 'text/plain')},
        )
        self.assertEqual(second.status_code, 201)
        self.assertEqual(second.json()['version'], 2)
        approval = self.client.post(
            f"/deliveries/{second.json()['id']}/review", headers=self.headers,
            json={'decision': 'approve'},
        )
        self.assertEqual(approval.status_code, 200)
        self.assertEqual(approval.json()['status'], 'Pronta')
        history = self.client.get('/deliveries', headers=self.headers).json()
        self.assertEqual([(item['version'], item['status']) for item in history], [(2, 'Pronta'), (1, 'Revisão solicitada')])

    def test_complete_flow_secures_decision_assignment_revision_and_final_delivery(self):
        translator, translator_headers = self.translator_session()
        with requests_api.database() as connection:
            connection.execute(
                '''INSERT INTO users (id, email, name, role, password_hash, active)
                   VALUES (?, ?, ?, 'translator', ?, TRUE)''',
                ('other-translator', 'other@example.test', 'Other Translator', requests_api.hash_password('other-password-long-enough')),
            )
        other_login = self.client.post('/auth/login', json={
            'email': 'other@example.test', 'password': 'other-password-long-enough',
        }).json()
        other_headers = {'Authorization': 'Bearer ' + other_login['token']}

        request_id = self.create()
        self.save_quote(request_id)
        sent_token = {}

        def capture_quote(data, token):
            sent_token['value'] = token

        with patch.object(requests_api, 'deliver_quote', side_effect=capture_quote):
            sent = self.client.post(f'/requests/{request_id}/send-quote', headers=self.headers)
        self.assertEqual(sent.status_code, 200)
        quote_id = sent.json()['quote']['id']
        self.assertNotIn('quoteResponseTokenDigest', sent.json())
        self.assertEqual(self.client.post(
            f'/quotes/{quote_id}/decision', json={'token': 'x' * 48, 'decision': 'approve'},
        ).status_code, 403)
        approved = self.client.post(
            f'/quotes/{quote_id}/decision', json={'token': sent_token['value'], 'decision': 'approve'},
        )
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.json()['status'], 'Orçamento aprovado')
        self.assertEqual(self.client.post(
            f'/quotes/{quote_id}/decision', json={'token': sent_token['value'], 'decision': 'decline'},
        ).status_code, 409)

        translators = self.client.get('/translators', headers=self.headers)
        self.assertEqual(translators.status_code, 200)
        self.assertEqual({item['id'] for item in translators.json()}, {translator['id'], 'other-translator'})
        assignment = self.client.post(f'/requests/{request_id}/assign', headers=self.headers, json={
            'translatorId': translator['id'], 'deadline': '2026-10-10', 'observations': 'Use the approved glossary.',
        })
        self.assertEqual(assignment.status_code, 201)
        task_id = assignment.json()['id']
        self.assertEqual(assignment.json()['status'], 'Tradutor atribuído')
        self.assertEqual(self.client.post(f'/requests/{request_id}/assign', headers=self.headers, json={
            'translatorId': translator['id'], 'deadline': '2026-10-10',
        }).status_code, 409)

        self.assertEqual(self.client.get('/tasks', headers=other_headers).json(), [])
        self.assertEqual(self.client.get(f'/tasks/{task_id}', headers=other_headers).status_code, 403)
        self.assertEqual(self.client.get(f'/tasks/{task_id}/attachments/0', headers=other_headers).status_code, 403)
        own_task = self.client.get(f'/tasks/{task_id}', headers=translator_headers)
        self.assertEqual(own_task.status_code, 200)
        self.assertEqual(own_task.json()['attachments'][0]['content'], '')
        original = self.client.get(f'/tasks/{task_id}/attachments/0', headers=translator_headers)
        self.assertEqual(original.content, b'Test translation document')
        self.assertEqual(self.client.post(f'/tasks/{task_id}/start', headers=other_headers).status_code, 403)
        started = self.client.post(f'/tasks/{task_id}/start', headers=translator_headers)
        self.assertEqual(started.status_code, 200)
        self.assertEqual(started.json()['status'], 'Em andamento')

        first = self.client.post(
            f'/tasks/{task_id}/deliveries', headers=translator_headers,
            files={'file': ('translated-v1.txt', b'First complete version', 'text/plain')},
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.json()['status'], 'Aguardando avaliação')
        revision = self.client.post(
            f"/deliveries/{first.json()['id']}/review", headers=self.headers,
            json={'decision': 'request_revision', 'feedback': 'Revise the terminology on page two.'},
        )
        self.assertEqual(revision.status_code, 200)
        self.assertEqual(revision.json()['status'], 'Revisão solicitada')
        revised_task = self.client.get(f'/tasks/{task_id}', headers=translator_headers).json()
        self.assertEqual(revised_task['lastFeedback'], 'Revise the terminology on page two.')

        second = self.client.post(
            f'/tasks/{task_id}/deliveries', headers=translator_headers,
            files={'file': ('translated-v2.txt', b'Second complete version', 'text/plain')},
        )
        approval = self.client.post(
            f"/deliveries/{second.json()['id']}/review", headers=self.headers,
            json={'decision': 'approve'},
        )
        self.assertEqual(approval.status_code, 200)
        self.assertEqual(approval.json()['status'], 'Pronta')
        self.assertEqual(self.client.post(f'/tasks/{task_id}/send-final', headers=self.headers).status_code, 503)
        with patch.object(requests_api, 'deliver_final') as final_delivery:
            delivered = self.client.post(f'/tasks/{task_id}/send-final', headers=self.headers)
        self.assertEqual(delivered.status_code, 200)
        self.assertEqual(delivered.json()['status'], 'Entregue')
        final_delivery.assert_called_once()
        self.assertEqual(self.client.post(f'/tasks/{task_id}/send-final', headers=self.headers).status_code, 409)
        request_detail = self.client.get(f'/requests/{request_id}', headers=self.headers).json()
        self.assertEqual(request_detail['status'], 'Entregue')
        statuses = [event['status'] for event in request_detail['history']]
        for expected in ('Recebido', 'Em análise', 'Orçamento enviado', 'Orçamento aprovado', 'Tradutor atribuído',
                         'Em andamento', 'Aguardando avaliação', 'Revisão solicitada', 'Pronta', 'Entregue'):
            self.assertIn(expected, statuses)


if __name__ == '__main__':
    unittest.main()
