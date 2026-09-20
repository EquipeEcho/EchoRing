import base64
import hashlib
import os
import smtplib
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
import requests_api


class RequestsTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.environment = patch.dict(os.environ, {
            'REQUESTS_DB_PATH': os.path.join(self.directory.name, 'intake.sqlite3'),
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
        self.token = response.json()['token']
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
        self.environment.stop()
        self.directory.cleanup()

    def create(self):
        result = self.client.post('/requests', json=self.intake)
        self.assertEqual(result.status_code, 201)
        return result.json()['id']

    def save_quote(self, request_id):
        result = self.client.patch('/requests/' + request_id, headers=self.headers, json={'quote': self.quote})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['status'], 'Em análise')

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
        self.assertEqual(detail['quote'], self.quote)
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
            self.assertIn('R$ 350,50', message.get_content())
            self.assertFalse(message.is_multipart())

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
        with tempfile.TemporaryDirectory() as empty_directory, patch.dict(os.environ, {
            'REQUESTS_DB_PATH': os.path.join(empty_directory, 'empty.sqlite3'),
            'ADMIN_PASSWORD': '', 'STAFF_PASSWORD': '', 'TRANSLATOR_PASSWORD': '',
        }):
            self.assertEqual(self.client.post('/staff/login', json={'email': 'staff@example.test', 'password': 'test-password-long-enough'}).status_code, 401)


if __name__ == '__main__':
    unittest.main()
