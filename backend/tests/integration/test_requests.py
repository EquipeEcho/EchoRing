"""HTTP integration coverage for intake, profiles, quotes and deliveries."""

import hashlib
import base64
import os
import smtplib
import uuid
from datetime import datetime, timezone
from unittest.mock import patch
from psycopg.types.json import Jsonb
from fastapi.testclient import TestClient
from main import app
from app import database_pg as db
from app.core import security
from app.routes import requests_routes
from app.services.email import quote_service

from tests.support.portal_test_case import PortalTestCase
from app import mongo
from app.repositories import translator_profile_store
from app.services.email import service as email_service
from app.services.email import workflow_service as core_email




class RequestsTests(PortalTestCase):
    def test_public_intake_is_persistent_and_staff_only(self):
        """Garante persistência pública, leitura restrita e conteúdo oculto na listagem."""
        request_id = self.create()
        stored_client = mongo.get_db()['clients'].find_one({'email': self.intake['email']})
        self.assertIsNotNone(stored_client)
        self.assertEqual(stored_client['name'], self.intake['name'])
        self.assertEqual(stored_client['created_by'], 'landing-page')
        self.assertEqual(self.client.get('/requests').status_code, 401)
        self.assertEqual(self.client.get('/requests/' + request_id).status_code, 401)
        listing = self.client.get('/requests', headers=self.headers).json()
        self.assertEqual(listing[0]['id'], request_id)
        self.assertEqual(listing[0]['attachments'][0]['content'], '')
        detail = self.client.get('/requests/' + request_id, headers=self.headers).json()
        self.assertEqual(detail['attachments'], self.intake['attachments'])
        client_listing = self.client.get('/clients', headers=self.headers)
        self.assertEqual(client_listing.status_code, 200)
        client = next(item for item in client_listing.json() if item['email'] == self.intake['email'])
        self.assertEqual(client['projects'][0]['id'], request_id)
        self.assertEqual(client['projects'][0]['title'], self.intake['title'])
        self.assertEqual(client['projects'][0]['status'], 'Recebido')
        self.save_quote(request_id)
        updated_client = next(
            item for item in self.client.get('/clients', headers=self.headers).json()
            if item['email'] == self.intake['email']
        )
        self.assertEqual(updated_client['projects'][0]['status'], 'Em análise')
        with TestClient(app) as second_client:
            self.assertEqual(second_client.get('/requests', headers=self.headers).json()[0]['id'], request_id)

    def test_intake_accepts_document_variants_and_rejects_languages_outside_the_list(self):
        for field in ('source', 'target'):
            response = self.client.post('/requests', json={**self.intake, field: 'Bielorrusso'})
            self.assertEqual(response.status_code, 422, response.text)
        self.intake = {**self.intake, 'source': 'Inglês (Reino Unido)', 'target': 'Português (Portugal)'}
        request_id = self.create()
        detail = self.client.get('/requests/' + request_id, headers=self.headers).json()
        self.assertEqual(detail['source'], 'Inglês (Reino Unido)')
        self.assertEqual(detail['target'], 'Português (Portugal)')



    def test_translator_login_returns_role_and_cannot_access_staff_requests(self):
        """Confere a sessão do tradutor e o bloqueio das rotas exclusivas da equipe."""
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
        """Confere cadastro seguro, permissões de administrador e login da nova conta."""
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
        with db.database() as connection:
            stored = connection.execute('SELECT password_hash FROM users WHERE email = ?', ('hr@example.test',)).fetchone()
            self.assertTrue(stored['password_hash'].startswith('pbkdf2_sha256$'))
            self.assertNotEqual(stored['password_hash'], new_user['password'])
        hr_login = self.client.post('/auth/login', json={'email': 'hr@example.test', 'password': new_user['password']})
        self.assertEqual(hr_login.status_code, 200)
        self.assertEqual(hr_login.json()['role'], 'hr')
        hr_headers = {'Authorization': 'Bearer ' + hr_login.json()['token']}
        self.assertEqual(self.client.get('/users', headers=hr_headers).status_code, 403)
        self.assertEqual(self.client.post('/users', headers=admin_headers, json={**new_user, 'email': 'short@example.test', 'password': 'short'}).status_code, 422)
        self.assertEqual(self.client.post('/users', headers=admin_headers, json={**new_user, 'email': 'six@example.test', 'password': 'senha6'}).status_code, 201)
        self.assertEqual(self.client.post('/users', headers=admin_headers, json={**new_user, 'email': 'other@example.test', 'role': 'admin'}).status_code, 422)

    def test_new_translator_must_complete_registration_and_profile_is_persistent(self):
        created, session, headers = self.invited_translator()
        self.assertTrue(created['onboardingRequired'])
        self.assertTrue(session['onboardingRequired'])
        initial = self.client.get('/translator-profile/me', headers=headers)
        self.assertEqual(initial.status_code, 200)
        self.assertEqual(initial.json()['profile']['fullName'], created['name'])
        self.assertIsNone(initial.json()['completedAt'])
        self.assertEqual(self.client.get('/tasks', headers=headers).status_code, 403)
        self.assertEqual(self.client.get('/services', headers=headers).status_code, 403)
        self.assertNotIn(created['id'], {item['id'] for item in self.client.get('/translators', headers=self.headers).json()})
        draft = self.client.patch('/translator-profile/me', headers=headers, json={'phone': '+55 11 99999-0000', 'country': 'Brasil'})
        self.assertEqual(draft.status_code, 200)
        self.assertTrue(draft.json()['account']['onboardingRequired'])
        self.assertIsNone(draft.json()['completedAt'])
        partial = self.client.patch('/translator-profile/me', headers=headers, json={'city': 'São Paulo'})
        self.assertEqual(partial.status_code, 200)
        self.assertEqual(partial.json()['profile']['phone'], '+55 11 99999-0000')
        with TestClient(app) as second_client:
            restored = second_client.get('/translator-profile/me', headers=headers).json()
            self.assertEqual(restored['profile']['city'], 'São Paulo')
            self.assertEqual(restored['profile']['fullName'], created['name'])
        saved = self.client.put('/translator-profile/me', headers=headers, json=self.complete_profile())
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertFalse(saved.json()['account']['onboardingRequired'])
        self.assertIsNotNone(saved.json()['completedAt'])
        self.assertEqual(saved.json()['profile'], self.complete_profile())
        self.assertFalse(self.client.get('/auth/me', headers=headers).json()['onboardingRequired'])
        self.assertEqual(self.client.get('/tasks', headers=headers).status_code, 200)
        self.assertIn(created['id'], {item['id'] for item in self.client.get('/translators', headers=self.headers).json()})
        login = self.client.post('/auth/login', json={'email': session['email'], 'password': 'invited-translator-password'})
        self.assertFalse(login.json()['onboardingRequired'])
        self.assertEqual(login.json()['name'], 'Marina Costa')

    def test_legacy_pairs_do_not_block_profile_reads_or_saves(self):
        created, _, headers = self.invited_translator()
        profile = self.complete_profile()
        legacy = {**profile, 'translationPairs': [{'source': 'Inglês', 'target': 'Português'}]}
        draft = self.client.patch('/translator-profile/me', headers=headers, json=legacy)
        self.assertEqual(draft.status_code, 200, draft.text)
        self.assertEqual(draft.json()['profile'], profile)
        self.assertTrue(draft.json()['account']['onboardingRequired'])
        completed = self.client.put('/translator-profile/me', headers=headers, json=profile)
        self.assertEqual(completed.status_code, 200, completed.text)
        with db.database() as connection:
            connection.execute('UPDATE translator_profiles SET data = ? WHERE user_id = ?', (Jsonb(legacy), created['id']))
        for path, auth in [('/translator-profile/me', headers),
                           ('/translator-profile/' + created['id'], self.headers)]:
            restored = self.client.get(path, headers=auth)
            self.assertEqual(restored.status_code, 200, restored.text)
            self.assertEqual(restored.json()['profile'], profile)
            self.assertEqual(restored.json()['completedAt'], completed.json()['completedAt'])
        saved = self.client.put('/translator-profile/me', headers=headers, json=legacy)
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()['profile'], profile)
        with db.database() as connection:
            stored = connection.execute('SELECT data FROM translator_profiles WHERE user_id = ?', (created['id'],)).fetchone()
            self.assertEqual(db.json_data(stored['data']), profile)

    def test_translator_profile_rejects_incomplete_invalid_and_forged_data(self):
        _, _, headers = self.invited_translator()
        for changes in [
            {'fullName': ''}, {'phone': 'invalid'}, {'city': ''}, {'country': ''},
            {'languages': [{'name': 'Inglês', 'level': 'Fluente'}]},
            {'languages': [{'name': 'Português (Brasil)', 'level': 'Nativo'}, {'name': 'Klingon', 'level': 'Fluente'}]},
            {'languages': [{'name': 'English', 'level': 'Fluente'}, {'name': 'ENGLISH', 'level': 'Nativo'}]},
            {'education': ''}, {'experienceYears': None}, {'experienceYears': -1},
            {'experienceYears': True}, {'experienceSummary': ''}, {'specializations': []},
            {'portfolioLinks': ['javascript:alert(1)']}, {'portfolioLinks': ['https://user:password@example.test']},
            {'availabilityHours': 81}, {'onboardingRequired': False}, {'user_id': 'someone-else'},
        ]:
            with self.subTest(changes=changes):
                response = self.client.put('/translator-profile/me', headers=headers, json={**self.complete_profile(), **changes})
                self.assertEqual(response.status_code, 422, response.text)
        self.assertTrue(self.client.get('/auth/me', headers=headers).json()['onboardingRequired'])
        self.assertEqual(self.client.patch('/translator-profile/me', headers=headers, json={'tools': ['x' * 81]}).status_code, 422)

    def test_profile_is_owner_only_and_late_draft_cannot_overwrite_completion(self):
        _, _, headers = self.invited_translator()
        self.assertEqual(self.client.get('/translator-profile/me').status_code, 401)
        self.assertEqual(self.client.get('/translator-profile/me', headers=self.headers).status_code, 403)
        self.assertEqual(self.client.put('/translator-profile/me', headers=self.headers, json=self.complete_profile()).status_code, 403)
        completed = self.client.put('/translator-profile/me', headers=headers, json=self.complete_profile()).json()
        self.assertEqual(self.client.patch('/translator-profile/me', headers=headers, json={'bio': 'Late draft'}).status_code, 409)
        self.assertEqual(self.client.get('/translator-profile/me', headers=headers).json()['profile']['bio'], self.complete_profile()['bio'])
        changed = self.client.put('/translator-profile/me', headers=headers, json={**self.complete_profile(), 'bio': 'Atualização do perfil completo.'})
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.json()['completedAt'], completed['completedAt'])
        legacy, legacy_headers = self.translator_session()
        self.assertFalse(legacy['onboardingRequired'])
        self.assertEqual(self.client.get('/tasks', headers=legacy_headers).status_code, 200)
        self.assertEqual(self.client.get('/translator-profile/me', headers=legacy_headers).json()['profile']['bio'], '')

    def test_team_reads_translator_profile_and_activity_without_editing_or_cross_account_access(self):
        admin = self.client.post('/auth/login', json={'email': 'admin@example.test', 'password': 'admin-password-long-enough'}).json()
        admin_headers = {'Authorization': 'Bearer ' + admin['token']}
        created, _, headers = self.invited_translator(admin_headers=admin_headers)
        self.assertEqual(self.client.put('/translator-profile/me', headers=headers, json=self.complete_profile()).status_code, 200)
        other, _, other_headers = self.invited_translator('other-profile@example.test', admin_headers=admin_headers)
        with db.database() as connection:
            for index, status in enumerate(['Tradutor atribuído', 'Em andamento', 'Revisão solicitada', 'Aguardando avaliação', 'Pronta', 'Entregue']):
                connection.execute('INSERT INTO services (id, title, translator_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
                                   ('PROFILE-TASK-' + str(index), 'Profile project', created['id'], status, db.now()))
            connection.execute('INSERT INTO services (id, title, translator_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
                               ('OTHER-PROFILE-TASK', 'Other project', other['id'], 'Entregue', db.now()))
        route = '/translator-profile/' + created['id']
        own = self.client.get('/translator-profile/me', headers=headers).json()
        self.assertEqual(own['activity'], {'totalProjects': 6, 'activeProjects': 3, 'awaitingReview': 1, 'completedProjects': 2})
        self.assertEqual(self.client.get(route).status_code, 401)
        self.assertEqual(self.client.get(route, headers=other_headers).status_code, 403)
        self.assertEqual(self.client.get('/translator-profile/' + other['id'], headers=headers).status_code, 403)
        team = self.client.get(route, headers=self.headers)
        self.assertEqual(team.status_code, 200)
        self.assertEqual(team.json(), own)
        self.assertEqual(self.client.put('/translator-profile/me', headers=self.headers, json=self.complete_profile()).status_code, 403)
        self.assertEqual(self.client.get('/translator-profile/unknown', headers=self.headers).status_code, 404)
        self.assertEqual(self.client.get('/translator-profile/' + other['id'], headers=self.headers).json()['activity']['totalProjects'], 1)
        self.assertEqual(self.client.get(route, headers=admin_headers).status_code, 200)
        self.client.post('/users', headers=admin_headers, json={'name': 'Profile HR', 'email': 'profile-hr@example.test', 'password': 'profile-hr-password', 'role': 'hr'})
        hr = self.client.post('/auth/login', json={'email': 'profile-hr@example.test', 'password': 'profile-hr-password'}).json()
        self.assertEqual(self.client.get(route, headers={'Authorization': 'Bearer ' + hr['token']}).status_code, 200)

    def test_rejects_invalid_consent_email_languages_and_documents(self):
        """Rejeita solicitações com campos inseguros, arquivos falsos ou corpo grande demais."""
        for changes in [{'consent': False}, {'email': 'bad\r\nBcc: example@test.local'}, {'target': 'English'}, {'name': '   '}, {'attachments': [{'name': 'fake.pdf', 'size': 3, 'content': 'YWJj'}]}, {'attachments': [{'name': '../sample.txt', 'size': 3, 'content': 'YWJj'}]}]:
            with self.subTest(changes=changes):
                self.assertEqual(self.client.post('/requests', json={**self.intake, **changes}).status_code, 422)
        self.assertEqual(self.client.post('/requests', content=b'x' * (8 * 1024 * 1024 + 1), headers={'Content-Type': 'application/json'}).status_code, 413)

    def test_quote_draft_survives_missing_smtp_and_failed_delivery(self):
        """Mantém o orçamento salvo quando o SMTP está ausente ou falha no envio."""
        request_id = self.create()
        self.save_quote(request_id)
        with patch.object(requests_routes, 'deliver_quote', wraps=quote_service.deliver_quote):
            self.assertEqual(self.client.post('/requests/' + request_id + '/send-quote', headers=self.headers).status_code, 503)
        with patch.object(requests_routes, 'deliver_quote', side_effect=smtplib.SMTPException('provider unavailable')):
            self.assertEqual(self.client.post('/requests/' + request_id + '/send-quote', headers=self.headers).status_code, 502)
        detail = self.client.get('/requests/' + request_id, headers=self.headers).json()
        self.assertEqual({key: detail['quote'][key] for key in self.quote}, self.quote)
        self.assertEqual(detail['status'], 'Em análise')
        self.assertNotIn('emailSentAt', detail)

    def test_successful_delivery_marks_sent_and_prevents_duplicate_and_edits(self):
        """Após o envio, bloqueia uma segunda mensagem e novas mudanças na proposta."""
        request_id = self.create()
        self.save_quote(request_id)
        with patch.object(requests_routes, 'deliver_quote') as delivery:
            result = self.client.post('/requests/' + request_id + '/send-quote', headers=self.headers)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json()['status'], 'Orçamento enviado')
            self.assertIn('emailSentAt', result.json())
            self.assertEqual(self.client.post('/requests/' + request_id + '/send-quote', headers=self.headers).status_code, 409)
            delivery.assert_called_once()
        self.assertEqual(self.client.patch('/requests/' + request_id, headers=self.headers, json={'quote': self.quote}).status_code, 409)

    def test_smtp_uses_tls_and_sends_to_request_email(self):
        """Confere TLS, destinatário, valor formatado e links no e-mail de orçamento."""
        data = {**self.intake, 'id': 'SOL-TEST', 'quote': self.quote}
        with patch.dict(os.environ, {'SMTP_HOST': 'smtp.example.test', 'SMTP_FROM': 'staff@example.test', 'SMTP_SECURITY': 'starttls'}), patch.object(email_service.smtplib, 'SMTP') as smtp:
            quote_service.deliver_quote(data)
            connection = smtp.return_value.__enter__.return_value
            connection.starttls.assert_called_once()
            message = connection.send_message.call_args.args[0]
            self.assertEqual(message['To'], 'client@example.test')
            self.assertIn('R$ 350,50', message.get_body(preferencelist=('plain',)).get_content())
            self.assertIn('/orcamento/', message.get_body(preferencelist=('plain',)).get_content())
            self.assertTrue(message.is_multipart())

    def test_logout_expiry_rate_limit_and_unknown_account(self):
        """Cobre encerramento, expiração, limite de tentativas e conta inexistente."""
        self.assertEqual(self.client.post('/staff/logout', headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get('/requests', headers=self.headers).status_code, 401)
        with db.database() as connection:
            connection.execute('INSERT INTO sessions (digest, expires) VALUES (?, ?)', (hashlib.sha256(b'expired').hexdigest(), 0))
        self.assertEqual(self.client.get('/requests', headers={'Authorization': 'Bearer expired'}).status_code, 401)
        for _ in range(4):
            self.assertEqual(self.client.post('/staff/login', json={'email': 'wrong', 'password': 'wrong'}).status_code, 401)
        self.assertEqual(self.client.post('/staff/login', json={'email': 'wrong', 'password': 'wrong'}).status_code, 429)
        security._attempts.clear()
        empty_schema = 'test_' + uuid.uuid4().hex
        with patch.dict(os.environ, {
            'POSTGRES_SCHEMA': empty_schema,
            'ADMIN_PASSWORD': '', 'STAFF_PASSWORD': '', 'TRANSLATOR_PASSWORD': '',
        }):
            self.assertEqual(self.client.post('/staff/login', json={'email': 'staff@example.test', 'password': 'test-password-long-enough'}).status_code, 401)
            self.drop_schema(empty_schema)

    def test_delivery_upload_requires_the_assigned_translator_and_valid_document(self):
        """Aceita a versão somente do tradutor responsável e atualiza tarefa e arquivo."""
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

        with db.database() as connection:
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

    def test_delivery_accepts_multiple_documents_above_the_intake_body_limit(self):
        translator, headers = self.translator_session()
        service_id = self.create_service(translator['id'])
        content = b'x' * (5 * 1024 * 1024)
        response = self.client.post(f'/tasks/{service_id}/deliveries', headers=headers, files=[
            ('files', ('part-one.txt', content, 'text/plain')),
            ('files', ('part-two.txt', content, 'text/plain')),
        ])
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual([file['size'] for file in response.json()['files']], [len(content), len(content)])

    def test_legacy_multi_document_deliveries_keep_all_files_available(self):
        translator, headers = self.translator_session()
        service_id = self.create_service(translator['id'])
        response = self.client.post(f'/tasks/{service_id}/deliveries', headers=headers,
            files={'file': ('first.txt', b'First document', 'text/plain')})
        self.assertEqual(response.status_code, 201)
        delivery_id = response.json()['id']
        legacy = [{'name': name, 'media_type': 'text/plain', 'size': len(content),
                   'content': base64.b64encode(content).decode('ascii')}
                  for name, content in [('first.txt', b'First document'), ('second.txt', b'Second document')]]
        with db.database() as connection:
            connection.execute('DELETE FROM delivery_files WHERE delivery_id = ?', (delivery_id,))
            connection.execute('UPDATE deliveries SET files = ? WHERE id = ?', (Jsonb(legacy), delivery_id))
        detail = self.client.get(f'/deliveries/{delivery_id}', headers=self.headers)
        self.assertEqual([file['name'] for file in detail.json()['files']], ['first.txt', 'second.txt'])
        download = self.client.get(f'/deliveries/{delivery_id}/files/1', headers=self.headers)
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.content, b'Second document')
        task = self.client.get(f'/tasks/{service_id}', headers=headers)
        self.assertEqual(len(task.json()['lastDelivery']['files']), 2)

    def test_delivery_upload_rejects_unsafe_or_invalid_documents(self):
        """Bloqueia nomes perigosos, formatos falsos, extensões proibidas e arquivos vazios."""
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

    def test_translator_uploads_multiple_documents_as_one_version(self):
        """Agrupa vários arquivos na mesma versão e permite baixar cada um separadamente."""
        translator, translator_headers = self.translator_session()
        service_id = self.create_service(translator['id'])
        response = self.client.post(
            f'/tasks/{service_id}/deliveries', headers=translator_headers,
            files=[
                ('files', ('chapter-one.txt', b'First translated chapter', 'text/plain')),
                ('files', ('chapter-two.txt', b'Second translated chapter', 'text/plain')),
            ],
        )

        self.assertEqual(response.status_code, 201)
        delivery = response.json()
        self.assertEqual(delivery['version'], 1)
        self.assertEqual([item['name'] for item in delivery['files']], ['chapter-one.txt', 'chapter-two.txt'])
        task = self.client.get(f'/tasks/{service_id}', headers=translator_headers).json()
        self.assertEqual(len(task['lastDelivery']['files']), 2)

        second = self.client.get(f"/deliveries/{delivery['id']}/files/1", headers=self.headers)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.content, b'Second translated chapter')
        self.assertEqual(self.client.get(f"/deliveries/{delivery['id']}/files/2", headers=self.headers).status_code, 404)

    def test_staff_review_preserves_versions_and_protects_the_file(self):
        """Mantém o histórico das versões e restringe arquivo e avaliação à equipe."""
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
        self.assertEqual(approval.json()['status'], 'Entregue')
        history = self.client.get('/deliveries', headers=self.headers).json()
        self.assertEqual([(item['version'], item['status']) for item in history], [(2, 'Entregue'), (1, 'Revisão solicitada')])

    def test_complete_flow_secures_decision_assignment_revision_and_approval(self):
        """Percorre o fluxo completo e finaliza o serviço diretamente na aprovação."""
        sent_emails = self.enterContext(patch.object(core_email, 'send_email'))
        translator, translator_headers = self.translator_session()
        with db.database() as connection:
            connection.execute(
                '''INSERT INTO users (id, email, name, role, password_hash, active)
                   VALUES (?, ?, ?, 'translator', ?, TRUE)''',
                ('other-translator', 'other@example.test', 'Other Translator', security.hash_password('other-password-long-enough')),
            )
        other_login = self.client.post('/auth/login', json={
            'email': 'other@example.test', 'password': 'other-password-long-enough',
        }).json()
        other_headers = {'Authorization': 'Bearer ' + other_login['token']}

        request_id = self.create()
        self.save_quote(request_id)
        sent_token = {}

        def capture_quote(data, token):
            """Guarda o token que seria enviado por e-mail para simular a resposta do cliente."""
            sent_token['value'] = token

        with patch.object(requests_routes, 'deliver_quote', side_effect=capture_quote):
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
        self.assertEqual(approval.json()['status'], 'Entregue')
        completed_task = self.client.get(f'/tasks/{task_id}', headers=translator_headers).json()
        self.assertEqual(completed_task['status'], 'Entregue')
        self.assertTrue(completed_task['deliveredAt'])
        self.assertEqual(self.client.post(f'/tasks/{task_id}/send-final', headers=self.headers).status_code, 404)
        request_detail = self.client.get(f'/requests/{request_id}', headers=self.headers).json()
        self.assertEqual(request_detail['status'], 'Entregue')
        statuses = [event['status'] for event in request_detail['history']]
        for expected in ('Recebido', 'Em análise', 'Orçamento enviado', 'Orçamento aprovado', 'Tradutor atribuído',
                         'Em andamento', 'Aguardando avaliação', 'Revisão solicitada', 'Entregue'):
            self.assertIn(expected, statuses)


        emails = [call.kwargs for call in sent_emails.call_args_list]
        self.assertEqual([email['template'] for email in emails], ['aviso', 'entrega'])
        self.assertEqual(emails[0]['to'], 'translator@example.test')
        self.assertEqual(emails[1]['to'], 'client@example.test')
        self.assertEqual(emails[1]['attachments'][0]['name'], 'translated-v2.txt')
        self.assertEqual(emails[1]['attachments'][0]['content'], b'Second complete version')

    def test_email_attachments_are_added_to_message(self):
        """Anexa os arquivos ao e-mail mantendo a versão em texto e HTML."""
        attachment = {'name': 'traducao.txt', 'content': b'Texto traduzido', 'media_type': 'text/plain'}
        with patch.dict(os.environ, {'SMTP_HOST': 'smtp.example.test', 'SMTP_FROM': 'staff@example.test'}), \
                patch.object(email_service.smtplib, 'SMTP') as smtp:
            email_service.send_email('client@example.test', 'Oi', 'aviso', {'titulo': 'T', 'mensagem': 'M'}, attachments=[attachment])
            message = smtp.return_value.__enter__.return_value.send_message.call_args.args[0]
        files = list(message.iter_attachments())
        self.assertEqual(files[0].get_filename(), 'traducao.txt')
        self.assertEqual(files[0].get_content(), 'Texto traduzido')
        self.assertIn('M', message.get_body(preferencelist=('plain',)).get_content())

    def test_auto_approve_quote_skips_email_for_local_workflow(self):
        """No modo local, aprova a proposta sem chamar o serviço de e-mail."""
        request_id = self.create()
        self.save_quote(request_id)

        with patch.dict(os.environ, {'AUTO_APPROVE_QUOTES': 'true'}), \
             patch.object(requests_routes, 'deliver_quote') as delivery:
            response = self.client.post(f'/requests/{request_id}/send-quote', headers=self.headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'Orçamento aprovado')
        self.assertEqual(response.json()['quoteDecision'], 'approve')
        self.assertTrue(response.json()['autoApproved'])
        self.assertNotIn('emailSentAt', response.json())
        delivery.assert_not_called()
        self.assertEqual(response.json()['history'][-1]['status'], 'Orçamento aprovado')
        self.assertIn('automática', response.json()['history'][-1]['note'])
