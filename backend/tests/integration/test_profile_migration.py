"""Legacy Mongo data is mocked; PostgreSQL uses the shared isolated schema."""
from datetime import datetime, timezone
import mongomock

from app.database_pg import database, json_data
from scripts.migrate_translator_profiles import migrate_profiles
from tests.support.portal_test_case import PortalTestCase


class ProfileMigrationTests(PortalTestCase):
    def test_preview_apply_and_retry_preserve_data_dates_and_newer_profiles(self):
        translator, headers = self.translator_session()
        source = mongomock.MongoClient()['legacy']['translator_profiles']
        profile = self.complete_profile()
        legacy = {**profile, 'translationPairs': [{'source': 'Inglês', 'target': 'Português'}]}
        source.insert_one({'_id': translator['id'], 'data': legacy,
                           'completed_at': '2026-10-01T10:00:00+00:00', 'updated_at': '2026-10-02T10:00:00+00:00'})
        source.insert_one({'_id': 'unknown-user', 'data': profile})
        preview = migrate_profiles(source)
        self.assertTrue(preview['dryRun'])
        self.assertEqual((preview['wouldImport'], preview['missingUser']), (1, 1))
        with database() as connection:
            self.assertIsNone(connection.execute('SELECT 1 FROM translator_profiles WHERE user_id = ?', (translator['id'],)).fetchone())
        self.assertEqual(migrate_profiles(source, apply=True)['imported'], 1)
        restored = self.client.get('/translator-profile/me', headers=headers)
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(restored.json()['profile'], profile)
        with database() as connection:
            row = connection.execute('SELECT * FROM translator_profiles WHERE user_id = ?', (translator['id'],)).fetchone()
            self.assertEqual(row['completed_at'], datetime(2026, 10, 1, 10, tzinfo=timezone.utc))
            self.assertEqual(row['updated_at'], datetime(2026, 10, 2, 10, tzinfo=timezone.utc))
            self.assertEqual(json_data(row['data']), profile)
        newer = {**profile, 'bio': 'Perfil mais recente salvo no PostgreSQL.'}
        self.assertEqual(self.client.put('/translator-profile/me', headers=headers, json=newer).status_code, 200)
        repeated = migrate_profiles(source, apply=True)
        self.assertEqual((repeated['imported'], repeated['existing']), (0, 1))
        self.assertEqual(self.client.get('/translator-profile/me', headers=headers).json()['profile']['bio'], newer['bio'])
        self.assertEqual(source.count_documents({}), 2)

    def test_invalid_profile_is_reported_without_changing_the_account(self):
        translator, _ = self.translator_session()
        source = mongomock.MongoClient()['legacy']['translator_profiles']
        source.insert_one({'_id': translator['id'], 'data': {'languages': [{'name': 'Inglês', 'level': 'invalid'}]}})
        self.assertEqual(migrate_profiles(source, apply=True)['invalid'], 1)
        with database() as connection:
            self.assertIsNone(connection.execute('SELECT 1 FROM translator_profiles WHERE user_id = ?', (translator['id'],)).fetchone())
