"""Shared isolated-schema setup and portal account/request fixtures."""

import base64
import os
import unittest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from app import database_pg as db
from app.core import security


class PortalTestCase(unittest.TestCase):
    def setUp(self):
        """Prepara contas, cliente HTTP e dados básicos usados em cada cenário."""
        self.schema = 'test_' + uuid.uuid4().hex
        self.environment = patch.dict(os.environ, {
            'POSTGRES_SCHEMA': self.schema,
            'ADMIN_EMAIL': 'admin@example.test', 'ADMIN_PASSWORD': 'admin-password-long-enough',
            'ADMIN_NAME': 'General Admin',
            'STAFF_EMAIL': 'staff@example.test', 'STAFF_PASSWORD': 'test-password-long-enough',
            'TRANSLATOR_EMAIL': 'translator@example.test', 'TRANSLATOR_PASSWORD': 'translator-password-long-enough',
            'TRANSLATOR_NAME': 'Test Translator',
            'SMTP_HOST': '', 'SMTP_FROM': '',
            'AUTO_APPROVE_QUOTES': 'false',
        })
        self.environment.start()
        security._attempts.clear()
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
        """Fecha o cliente e remove do PostgreSQL tudo que o teste criou."""
        self.client.close()
        self.drop_schema(self.schema)
        self.environment.stop()

    def drop_schema(self, schema):
        """Remove apenas schemas identificados como teste para proteger os demais dados."""
        if not schema.startswith('test_'):
            raise RuntimeError('Recusa ao remover schema que não pertence aos testes.')
        connection = db.postgres_connection()
        try:
            connection.execute(db.sql.SQL('DROP SCHEMA IF EXISTS {} CASCADE').format(db.sql.Identifier(schema)))
            connection.commit()
        finally:
            connection.close()

    def create(self):
        """Cria uma solicitação válida e devolve seu identificador."""
        result = self.client.post('/requests', json=self.intake)
        self.assertEqual(result.status_code, 201)
        return result.json()['id']

    def save_quote(self, request_id):
        """Salva a proposta padrão e confirma a entrada da solicitação em análise."""
        result = self.client.patch('/requests/' + request_id, headers=self.headers, json={'quote': self.quote})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['status'], 'Em análise')

    def translator_session(self):
        """Abre uma sessão de tradutor e devolve a conta junto com seu cabeçalho."""
        response = self.client.post('/auth/login', json={
            'email': 'translator@example.test', 'password': 'translator-password-long-enough',
        })
        self.assertEqual(response.status_code, 200)
        session = response.json()
        with db.database() as connection:
            translator = connection.execute('SELECT id FROM users WHERE email = ?', (session['email'],)).fetchone()
        return {**session, 'id': translator['id']}, {'Authorization': 'Bearer ' + session['token']}

    def create_service(self, translator_id, service_id='OS-TEST-001', status='Em andamento'):
        """Insere uma tarefa diretamente para os testes focados em entrega e revisão."""
        with db.database() as connection:
            connection.execute(
                '''INSERT INTO services (id, request_id, title, translator_id, status, deadline, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (service_id, 'SOL-' + service_id, 'Test manual', translator_id, status, '2026-10-01', db.now()),
            )
        return service_id

    def invited_translator(self, email='invited@example.test', admin_headers=None):
        if admin_headers is None:
            admin = self.client.post('/auth/login', json={'email': 'admin@example.test', 'password': 'admin-password-long-enough'}).json()
            admin_headers = {'Authorization': 'Bearer ' + admin['token']}
        created = self.client.post('/users', headers=admin_headers, json={
            'name': 'Invited Translator', 'email': email, 'password': 'invited-translator-password', 'role': 'translator',
        })
        self.assertEqual(created.status_code, 201)
        login = self.client.post('/auth/login', json={'email': email, 'password': 'invited-translator-password'})
        self.assertEqual(login.status_code, 200)
        return created.json(), login.json(), {'Authorization': 'Bearer ' + login.json()['token']}

    def complete_profile(self):
        return {
            'fullName': 'Marina Costa', 'phone': '+55 (11) 99999-0000', 'whatsapp': True,
            'country': 'Brasil', 'city': 'São Paulo', 'timezone': 'UTC-3',
            'professionalTitle': 'Tradutora técnica', 'bio': 'Traduções com foco em comunicação clara.',
            'languages': [{'name': 'Português', 'level': 'Nativo'}, {'name': 'Inglês', 'level': 'Fluente'}],
            'education': 'Graduação em Letras e formação complementar em tradução.',
            'experienceYears': 0, 'experienceSummary': 'Projetos acadêmicos de tradução e revisão de textos técnicos.',
            'specializations': ['Técnica', 'Tecnologia'], 'services': ['Tradução', 'Revisão'],
            'tools': ['Editor de textos'], 'certifications': 'Curso de revisão, concluído em 2025.',
            'portfolioLinks': ['https://example.test/portfolio'], 'availabilityHours': 20,
            'availabilityNotes': 'Disponível em dias úteis.', 'otherInformation': 'Experiência com glossários.',
        }
