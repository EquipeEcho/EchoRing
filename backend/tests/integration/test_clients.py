"""Client persistence, access control and manual intake integration."""
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
import mongomock
from fastapi.testclient import TestClient
from main import app
from app import mongo
from app.core.portal_auth import staff
from app.repositories import client_store
from tests.support.portal_test_case import PortalTestCase


class ClientMongoTests(unittest.TestCase):
    """Testa persistência de clientes no Mongo sem depender do PostgreSQL."""

    def setUp(self):
        self.environment = patch.dict(os.environ, {'MONGO_DB': 'test_clients'})
        self.environment.start()
        self.mongo = patch.object(mongo, '_client', mongomock.MongoClient())
        self.mongo.start()
        app.dependency_overrides[staff] = lambda: {
            'id': 'employee-test',
            'name': 'Test Employee',
            'role': 'employee',
        }
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.pop(staff, None)
        self.mongo.stop()
        self.environment.stop()

    def test_client_records_are_created_listed_and_unique_in_mongo(self):
        data = {'name': '  Example Client ', 'email': ' CLIENT@example.test ', 'company': ' Example Co '}
        created = self.client.post('/clients', json=data)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()['name'], 'Example Client')
        self.assertEqual(created.json()['email'], 'client@example.test')
        self.assertEqual(created.json()['company'], 'Example Co')
        with patch('app.routes.clients_routes.database') as database:
            database.return_value.__enter__.return_value.execute.return_value.fetchall.return_value = []
            self.assertEqual(self.client.get('/clients').json(), [created.json()])

        stored = mongo.get_db()['clients'].find_one({'_id': created.json()['id']})
        self.assertEqual(stored['created_by'], 'employee-test')
        self.assertEqual(stored['email'], 'client@example.test')
        self.assertEqual(self.client.post(
            '/clients',
            json={'name': 'Duplicate Client', 'email': 'client@example.test'},
        ).status_code, 409)

    def test_public_quote_upsert_keeps_one_client_per_email(self):
        from app.models.client import ClientCreate

        first = client_store.upsert_quote_client(
            ClientCreate(name='Landing Client', email='LANDING@example.test', company='First Company'),
            datetime(2026, 10, 21, tzinfo=timezone.utc),
        )
        updated = client_store.upsert_quote_client(
            ClientCreate(name='Landing Client Updated', email='landing@example.test', company='Updated Company'),
            datetime(2026, 10, 22, tzinfo=timezone.utc),
        )

        self.assertEqual(first['id'], updated['id'])
        self.assertEqual(updated['name'], 'Landing Client Updated')
        self.assertEqual(updated['company'], 'Updated Company')
        self.assertEqual(mongo.get_db()['clients'].count_documents({}), 1)



class ClientTests(PortalTestCase):
    def test_manual_client_intake_is_restricted_to_staff_and_persisted_as_request(self):
        """Garante acesso para funcionários e administradores usando o mesmo contrato Intake."""
        self.assertEqual(self.client.post('/requests/manual', json=self.intake).status_code, 401)
        _, translator_headers = self.translator_session()
        self.assertEqual(
            self.client.post('/requests/manual', headers=translator_headers, json=self.intake).status_code,
            403,
        )

        employee_created = self.client.post('/requests/manual', headers=self.headers, json=self.intake)
        self.assertEqual(employee_created.status_code, 201)
        employee_request = employee_created.json()
        self.assertEqual(employee_request['email'], self.intake['email'])
        self.assertEqual(employee_request['status'], 'Recebido')
        self.assertEqual(employee_request['history'][-1]['note'], 'Cadastro manual do cliente.')
        self.assertTrue(any(
            item['id'] == employee_request['id']
            for item in self.client.get('/requests', headers=self.headers).json()
        ))

        admin_login = self.client.post('/auth/login', json={
            'email': 'admin@example.test',
            'password': 'admin-password-long-enough',
        })
        admin_headers = {'Authorization': 'Bearer ' + admin_login.json()['token']}
        admin_created = self.client.post(
            '/requests/manual',
            headers=admin_headers,
            json={**self.intake, 'email': 'another-client@example.test'},
        )
        self.assertEqual(admin_created.status_code, 201)
        self.assertEqual(admin_created.json()['email'], 'another-client@example.test')

        invalid = self.client.post(
            '/requests/manual',
            headers=self.headers,
            json={**self.intake, 'source': self.intake['target']},
        )
        self.assertEqual(invalid.status_code, 422)


    def test_client_registration_stores_only_contact_data(self):
        """Salva os dados do cliente sem criar uma solicitação de tradução."""
        data = {'name': '  Example Client  ', 'email': '  CLIENT@example.test ', 'company': ' Example Co '}
        self.assertEqual(self.client.post('/clients', json=data).status_code, 401)
        _, translator_headers = self.translator_session()
        self.assertEqual(self.client.post('/clients', headers=translator_headers, json=data).status_code, 403)
        self.assertEqual(self.client.get('/clients', headers=translator_headers).status_code, 403)

        created = self.client.post('/clients', headers=self.headers, json=data)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()['name'], 'Example Client')
        self.assertEqual(created.json()['email'], 'client@example.test')
        self.assertEqual(created.json()['company'], 'Example Co')
        self.assertEqual(self.client.get('/clients', headers=self.headers).json(), [created.json()])
        stored_client = mongo.get_db()['clients'].find_one({'_id': created.json()['id']})
        self.assertEqual(
            {key: stored_client[key] for key in ('name', 'email', 'company')},
            {
                'name': 'Example Client',
                'email': 'client@example.test',
                'company': 'Example Co',
            },
        )
        self.assertTrue(stored_client['created_by'])
        self.assertIsInstance(stored_client['created_at'], datetime)
        self.assertEqual(self.client.get('/requests', headers=self.headers).json(), [])

        duplicate = self.client.post(
            '/clients',
            headers=self.headers,
            json={'name': 'Duplicate Client', 'email': 'CLIENT@example.test'},
        )
        self.assertEqual(duplicate.status_code, 409)
        for invalid in (
            {'name': '', 'email': 'client2@example.test'},
            {'name': 'Client', 'email': 'invalid'},
        ):
            self.assertEqual(self.client.post('/clients', headers=self.headers, json=invalid).status_code, 422)
