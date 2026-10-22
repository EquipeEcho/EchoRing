"""Integration tests against real PostgreSQL, including concurrent HTTP decisions."""

import base64
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from itertools import permutations
from threading import Barrier
import unittest
from unittest.mock import patch
import os

from fastapi.testclient import TestClient
from psycopg.types.json import Jsonb

from app.database_pg import database
from tests.support.portal_test_case import PortalTestCase
from main import app


class OfferTests(PortalTestCase):

    def prepare(self, second=False):
        account, self.translator_headers = self.translator_session()
        self.translator_id = account['id']
        profile = self.complete_profile()
        self.assertEqual(self.client.put('/translator-profile/me', headers=self.translator_headers, json=profile).status_code, 200)
        ids = [account['id']]
        if second:
            other, _, self.other_headers = self.invited_translator()
            self.other_id = other['id']
            self.assertEqual(self.client.put('/translator-profile/me', headers=self.other_headers, json=profile).status_code, 200)
            ids.append(other['id'])
        self.request_id = self.create()
        self.save_quote(self.request_id)
        with patch.dict(os.environ, {'AUTO_APPROVE_QUOTES': 'true'}):
            self.assertEqual(self.client.post(f'/requests/{self.request_id}/send-quote', headers=self.headers).status_code, 200)
        self.terms = {
            'translatorIds': ids, 'compensation': '120.50',
            'deadline': (datetime.now(timezone.utc) + timedelta(days=10)).date().isoformat(),
            'expiresAt': (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            'description': 'Tradução do manual técnico.', 'requirements': 'Preservar a terminologia.',
            'volume': '20 páginas / 4.000 palavras',
        }
        return self.request_id

    def send(self, terms=None, expected=201):
        response = self.client.post(f'/requests/{self.request_id}/offers', headers=self.headers, json=terms or self.terms)
        self.assertEqual(response.status_code, expected, response.text)
        return response.json()

    def race(self, actions):
        barrier = Barrier(len(actions))
        def call(action):
            with TestClient(app) as client:
                barrier.wait(timeout=15)
                path, headers = action
                return client.post(path, headers=headers)
        with ThreadPoolExecutor(max_workers=len(actions)) as pool:
            return list(pool.map(call, actions))

    def test_permissions_compatibility_and_atomic_send(self):
        self.prepare(second=True)
        path = f'/requests/{self.request_id}/offers'
        self.assertEqual(self.client.get('/opportunities').status_code, 401)
        self.assertEqual(self.client.get('/opportunities', headers=self.headers).status_code, 403)
        self.assertEqual(self.client.post(path, headers=self.translator_headers, json=self.terms).status_code, 403)
        candidates = self.client.get(f'/requests/{self.request_id}/compatible-translators', headers=self.headers).json()
        self.assertEqual({item['id'] for item in candidates}, set(self.terms['translatorIds']))
        with database() as connection:
            profile = self.complete_profile()
            profile['languages'] = [{'name': 'Inglês', 'level': 'Fluente'}, {'name': 'Espanhol', 'level': 'Nativo'}]
            connection.execute('UPDATE translator_profiles SET data = ? WHERE user_id = ?', (Jsonb(profile), self.other_id))
        self.send(expected=422)
        self.assertEqual(self.client.get(path, headers=self.headers).json(), [])
        offers = self.send({**self.terms, 'translatorIds': [self.translator_id]})
        offer = offers[0]
        for suffix in ['', '/accept', '/decline']:
            method = self.client.get if not suffix else self.client.post
            self.assertEqual(method('/opportunities/' + offer['id'] + suffix, headers=self.other_headers).status_code, 404)
        self.assertEqual(self.client.get(f"/opportunities/{offer['id']}/attachments/0", headers=self.other_headers).status_code, 404)
        self.assertEqual(self.client.post(f"/offers/{offer['id']}/cancel", headers=self.translator_headers).status_code, 403)
        self.assertEqual(self.client.post(f"/opportunities/{offer['id']}/accept", headers=self.headers).status_code, 403)
        self.send({**self.terms, 'translatorIds': [self.translator_id]}, expected=409)
        self.assertEqual(self.client.post(f'/requests/{self.request_id}/assign', headers=self.headers,
            json={'translatorId': self.other_id, 'deadline': self.terms['deadline']}).status_code, 409)

    def test_broadcast_is_visible_to_all_but_acceptance_requires_both_languages(self):
        self.prepare(second=True)
        with database() as connection:
            profile = self.complete_profile()
            profile['languages'] = [{'name': 'Inglês', 'level': 'Fluente'}, {'name': 'Espanhol', 'level': 'Nativo'}]
            connection.execute('UPDATE translator_profiles SET data = ? WHERE user_id = ?', (Jsonb(profile), self.other_id))
        offers = self.send({**self.terms, 'translatorIds': [], 'audience': 'all', 'workflowTemplateId': 'mtpe'})
        self.assertEqual(len(offers), 2)
        incompatible = self.client.get('/opportunities', headers=self.other_headers).json()[0]
        self.assertEqual(incompatible['audience'], 'all')
        self.assertFalse(incompatible['eligible'])
        self.assertEqual(self.client.post(f"/opportunities/{incompatible['id']}/accept", headers=self.other_headers).status_code, 422)
        self.send({**self.terms, 'translatorIds': [], 'audience': 'all'}, expected=409)
        selected = self.client.get('/opportunities', headers=self.translator_headers).json()[0]
        self.assertTrue(selected['eligible'])
        self.assertEqual(self.client.post(f"/opportunities/{selected['id']}/accept", headers=self.translator_headers).status_code, 200)
        task = self.client.get('/tasks', headers=self.translator_headers).json()[0]
        self.assertEqual(task['workflow']['templateId'], 'mtpe')
        self.assertEqual(task['workflow']['progress'], 0)
        self.assertEqual(task['workflow']['stages'][1]['assigneeId'], self.translator_id)
        self.assertEqual(self.client.get('/opportunities', headers=self.other_headers).json()[0]['status'], 'cancelled')

    def test_candidates_expose_languages_and_canonical_iso_aliases_match(self):
        self.prepare()
        candidates = self.client.get(f'/requests/{self.request_id}/compatible-translators', headers=self.headers).json()
        self.assertIn('languages', candidates[0])
        self.assertEqual(candidates[0]['languages'], self.complete_profile()['languages'])
        self.assertNotIn('translationPairs', candidates[0])
        from app.core.languages import LANGUAGES, language
        self.assertTrue(all(language(item['name']) == item['code'] for item in LANGUAGES))
        self.assertEqual(language('English'), language('Inglês'))
        self.assertEqual(language('English'), language('Inglês (EUA)'))
        self.assertEqual(language('Portuguese'), language('Português (Brasil)'))
        self.assertNotEqual(language('Inglês (EUA)'), language('Inglês (Reino Unido)'))
        self.assertNotEqual(language('Português (Brasil)'), language('Português (Portugal)'))
        self.assertEqual(language('Dutch'), language('Holandês'))
        self.assertEqual(language('Libras (Língua Brasileira de Sinais)'), 'sgn-BR')
        from app.models.translator_profile import TranslatorProfileComplete
        profile = self.complete_profile()
        profile['languages'].append({'name': 'English', 'level': 'Fluente'})
        with self.assertRaises(ValueError):
            TranslatorProfileComplete.model_validate(profile)
        self.assertEqual(self.client.post('/requests', json={**self.intake, 'target': 'Inglês'}).status_code, 422)
        profile['languages'] = [{'name': name, 'level': 'Fluente'} for name in ['Inglês (EUA)', 'Inglês (Reino Unido)']]
        self.assertEqual(len(TranslatorProfileComplete.model_validate(profile).languages), 2)

    def test_all_registered_languages_work_in_both_directions_without_pairs(self):
        self.prepare()
        profile = self.complete_profile()
        profile['languages'] = [{'name': name, 'level': 'Fluente'} for name in ['English', 'por', 'Spanish']]
        for source, target in permutations(['Inglês', 'Português', 'Espanhol'], 2):
            with self.subTest(source=source, target=target):
                self.intake = {**self.intake, 'source': source, 'target': target}
                self.request_id = self.create()
                self.save_quote(self.request_id)
                with patch.dict(os.environ, {'AUTO_APPROVE_QUOTES': 'true'}):
                    approved = self.client.post(f'/requests/{self.request_id}/send-quote', headers=self.headers)
                    self.assertEqual(approved.status_code, 200, approved.text)
                current_profile = profile if 'Português' in (source, target) else {
                    **profile, 'languages': [item for item in profile['languages'] if item['name'] != 'por']}
                saved = self.client.put('/translator-profile/me', headers=self.translator_headers, json=current_profile)
                self.assertEqual(saved.status_code, 200, saved.text)
                candidates = self.client.get(f'/requests/{self.request_id}/compatible-translators', headers=self.headers)
                self.assertEqual({item['id'] for item in candidates.json()}, {self.translator_id})
                offer = self.send()[0]
                detail = self.client.get('/opportunities/' + offer['id'], headers=self.translator_headers).json()
                self.assertTrue(detail['eligible'])
                accepted = self.client.post(f"/opportunities/{offer['id']}/accept", headers=self.translator_headers)
                self.assertEqual(accepted.status_code, 200, accepted.text)
                task = self.client.get('/tasks/' + accepted.json()['serviceId'], headers=self.translator_headers).json()
                self.assertEqual((task['source'], task['target']), (source, target))

    def test_private_details_documents_and_notifications(self):
        self.prepare()
        offer = self.send()[0]
        listing = self.client.get('/opportunities?status=pending&q=manual', headers=self.translator_headers)
        self.assertEqual(len(listing.json()), 1)
        detail = self.client.get('/opportunities/' + offer['id'], headers=self.translator_headers).json()
        self.assertEqual(detail['compensation'], '120.50')
        for key in ['quote', 'amount', 'clientEmail', 'email', 'translator', 'created_by']:
            self.assertNotIn(key, detail)
        self.assertNotIn('350', str(detail))
        self.assertNotIn('content', detail['attachments'][0])
        document = self.client.get(f"/opportunities/{offer['id']}/attachments/0", headers=self.translator_headers)
        self.assertEqual(document.content, base64.b64decode(self.intake['attachments'][0]['content']))
        self.assertEqual(document.headers['x-content-type-options'], 'nosniff')
        self.assertEqual(self.client.get(f"/opportunities/{offer['id']}/attachments/-1", headers=self.translator_headers).status_code, 404)
        notifications = self.client.get('/offer-notifications', headers=self.translator_headers).json()
        self.assertEqual(len(notifications), 1)
        notification_id = notifications[0]['id']
        self.assertEqual(self.client.post(f'/offer-notifications/{notification_id}/read', headers=self.headers).status_code, 404)
        self.assertEqual(self.client.post(f'/offer-notifications/{notification_id}/read', headers=self.translator_headers).status_code, 200)
        self.assertIsNotNone(self.client.get('/offer-notifications', headers=self.translator_headers).json()[0]['readAt'])

    def test_decline_cancel_resend_and_expiration_keep_history(self):
        self.prepare()
        first = self.send()[0]
        self.assertEqual(self.client.post(f"/opportunities/{first['id']}/decline", headers=self.translator_headers).json()['status'], 'declined')
        self.assertEqual(self.client.get(f"/opportunities/{first['id']}/attachments/0", headers=self.translator_headers).status_code, 403)
        second = self.send()[0]
        self.assertNotEqual(first['id'], second['id'])
        self.assertEqual(self.client.post(f"/offers/{second['id']}/cancel", headers=self.headers).json()['status'], 'cancelled')
        third = self.send()[0]
        with database() as connection:
            connection.execute("UPDATE job_offers SET created_at = CURRENT_TIMESTAMP - INTERVAL '2 days', expires_at = CURRENT_TIMESTAMP - INTERVAL '1 day' WHERE id = ?", (third['id'],))
        self.assertEqual(self.client.post(f"/opportunities/{third['id']}/accept", headers=self.translator_headers).status_code, 409)
        with database() as connection:
            self.assertEqual(connection.execute('SELECT status FROM job_offers WHERE id = ?', (third['id'],)).fetchone()['status'], 'expired')
            self.assertEqual(connection.execute("SELECT COUNT(*) AS count FROM job_offer_events WHERE offer_id = ? AND status = 'expired'", (third['id'],)).fetchone()['count'], 1)
        self.assertEqual(self.client.get('/opportunities?status=expired', headers=self.translator_headers).json()[0]['id'], third['id'])
        fourth = self.send()[0]
        history = self.client.get(f'/requests/{self.request_id}/offers', headers=self.headers).json()
        self.assertEqual({row['status'] for row in history}, {'pending', 'declined', 'expired', 'cancelled'})
        self.assertEqual(self.client.post(f"/opportunities/{fourth['id']}/accept", headers=self.translator_headers).status_code, 200)
        self.send(expected=409)

    def test_simultaneous_accepts_assign_exactly_one_task(self):
        self.prepare(second=True)
        offers = self.send()
        by_recipient = {row['translator']['id']: row['id'] for row in offers}
        responses = self.race([
            (f"/opportunities/{by_recipient[self.translator_id]}/accept", self.translator_headers),
            (f"/opportunities/{by_recipient[self.other_id]}/accept", self.other_headers),
        ])
        self.assertEqual(sorted(response.status_code for response in responses), [200, 409], [r.text for r in responses])
        with database() as connection:
            services = connection.execute('SELECT * FROM services WHERE request_id = ?', (self.request_id,)).fetchall()
            self.assertEqual(len(services), 1)
            self.assertEqual(str(services[0]['translator_compensation']), '120.50')
            statuses = connection.execute('SELECT status FROM job_offers WHERE request_id = ?', (self.request_id,)).fetchall()
            self.assertEqual(sorted(row['status'] for row in statuses), ['accepted', 'cancelled'])
        winner_headers = self.translator_headers if responses[0].status_code == 200 else self.other_headers
        loser_headers = self.other_headers if responses[0].status_code == 200 else self.translator_headers
        task = self.client.get('/tasks', headers=winner_headers).json()[0]
        self.assertEqual(task['compensation'], '120.50')
        self.assertNotIn('quote', task)
        self.assertEqual(self.client.get('/tasks', headers=loser_headers).json(), [])
        self.assertEqual(self.client.get('/tasks/' + task['id'], headers=loser_headers).status_code, 403)
        accepted = next(response.json() for response in responses if response.status_code == 200)
        self.assertEqual(self.client.post(f"/opportunities/{accepted['id']}/accept", headers=winner_headers).status_code, 409)
        # Existing execution -> delivery -> employee review continues after acceptance.
        self.assertEqual(self.client.post(f"/tasks/{task['id']}/start", headers=winner_headers).status_code, 200)
        delivery = self.client.post(f"/tasks/{task['id']}/deliveries", headers=winner_headers,
                                   files={'file': ('translation.txt', b'Traducao pronta', 'text/plain')})
        self.assertEqual(delivery.status_code, 201, delivery.text)
        reviewed = self.client.post(f"/deliveries/{delivery.json()['id']}/review", headers=self.headers, json={'decision': 'approve'})
        self.assertEqual(reviewed.status_code, 200, reviewed.text)
        self.assertEqual(self.client.get('/tasks/' + task['id'], headers=winner_headers).json()['compensation'], '120.50')
        staff_detail = self.client.get('/requests/' + self.request_id, headers=self.headers).json()
        self.assertEqual(staff_detail['task']['translator']['id'], services[0]['translator_id'])

    def test_periodic_expiration_is_idempotent(self):
        from app.services.offers_service import expire_pending_offers
        self.prepare()
        offer = self.send()[0]
        with database() as connection:
            connection.execute("UPDATE job_offers SET created_at = CURRENT_TIMESTAMP - INTERVAL '2 days', expires_at = CURRENT_TIMESTAMP - INTERVAL '1 day' WHERE id = ?", (offer['id'],))
        expire_pending_offers()
        expire_pending_offers()
        with database() as connection:
            self.assertEqual(connection.execute('SELECT status FROM job_offers WHERE id = ?', (offer['id'],)).fetchone()['status'], 'expired')
            self.assertEqual(connection.execute("SELECT COUNT(*) AS count FROM job_offer_events WHERE offer_id = ? AND status = 'expired'", (offer['id'],)).fetchone()['count'], 1)
        notifications = self.client.get('/offer-notifications', headers=self.translator_headers).json()
        self.assertEqual(sum('expirada' in item['message'] for item in notifications), 1)

    def test_accept_and_cancel_are_serialized(self):
        self.prepare()
        offer = self.send()[0]
        responses = self.race([(f"/opportunities/{offer['id']}/accept", self.translator_headers),
                               (f"/offers/{offer['id']}/cancel", self.headers)])
        self.assertEqual(sorted(r.status_code for r in responses), [200, 409], [r.text for r in responses])
        with database() as connection:
            row = connection.execute('SELECT status FROM job_offers WHERE id = ?', (offer['id'],)).fetchone()
            count = connection.execute('SELECT COUNT(*) AS count FROM services WHERE request_id = ?', (self.request_id,)).fetchone()['count']
            self.assertEqual(count, 1 if row['status'] == 'accepted' else 0)

    def test_validation_revalidation_and_onboarding(self):
        self.prepare()
        for changes in [{'compensation': '0'}, {'compensation': '-1'}, {'compensation': '1.001'},
                        {'translatorIds': []}, {'description': ' '}, {'volume': ''},
                        {'expiresAt': '2020-01-01T00:00:00Z'}, {'expiresAt': '2099-01-01T00:00:00Z'},
                        {'expiresAt': '2099-01-01T00:00:00'}, {'deadline': 'ontem'}]:
            self.send({**self.terms, **changes}, expected=422)
        offer = self.send()[0]
        with database() as connection:
            connection.execute('UPDATE users SET onboarding_required = TRUE WHERE id = ?', (self.translator_id,))
        self.assertEqual(self.client.get('/opportunities', headers=self.translator_headers).status_code, 403)
        self.assertEqual(self.client.post(f"/opportunities/{offer['id']}/accept", headers=self.translator_headers).status_code, 403)
        with database() as connection:
            connection.execute('UPDATE users SET onboarding_required = FALSE WHERE id = ?', (self.translator_id,))
            profile = self.complete_profile()
            profile['languages'] = [{'name': 'Inglês', 'level': 'Fluente'}, {'name': 'Espanhol', 'level': 'Nativo'}]
            profile['translationPairs'] = [{'source': 'Inglês', 'target': 'Português'}]
            connection.execute('UPDATE translator_profiles SET data = ? WHERE user_id = ?', (Jsonb(profile), self.translator_id))
        self.assertEqual(self.client.post(f"/opportunities/{offer['id']}/accept", headers=self.translator_headers).status_code, 422)
        with database() as connection:
            self.assertIsNone(connection.execute('SELECT 1 FROM services WHERE request_id = ?', (self.request_id,)).fetchone())


if __name__ == '__main__':
    unittest.main()
