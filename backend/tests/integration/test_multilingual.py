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
