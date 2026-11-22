"""HTTP integration coverage for the client's personal order tracking link."""

from unittest.mock import patch

from sqlalchemy import insert, update

from app import database_pg as db
from app.db_models import Service, TranslationRequest
from app.routes import requests_routes, tracking_routes
from tests.support.portal_test_case import PortalTestCase


class ClientTrackingTests(PortalTestCase):
    def approved_request(self):
        """Envia o orçamento, aprova pelo link do cliente e devolve o token de acompanhamento."""
        request_id = self.create()
        self.save_quote(request_id)
        quote_tokens, tracking_tokens = [], []
        with patch.object(requests_routes, 'deliver_quote', side_effect=lambda data, token, reminder=False: quote_tokens.append(token)):
            quote_id = self.client.post(f'/requests/{request_id}/send-quote', headers=self.headers).json()['quote']['id']
        with patch.object(requests_routes, 'send_tracking_link', side_effect=lambda data, token, **_: tracking_tokens.append(token)):
            decided = self.client.post(f'/quotes/{quote_id}/decision', json={'token': quote_tokens[0], 'decision': 'approve'})
        self.assertEqual(decided.status_code, 200, decided.text)
        return request_id, tracking_tokens

    def track(self, request_id, token):
        return self.client.post(f'/tracking/{request_id}', json={'token': token})

    def set_status(self, request_id, status):
        with db.database() as session:
            data, _ = requests_routes.read_request(session, request_id)
            session.execute(
                update(TranslationRequest).where(TranslationRequest.id == request_id).values(data={**data, 'status': status})
            )

    def test_approval_sends_a_link_that_shows_only_public_progress(self):
        request_id, tokens = self.approved_request()
        self.assertEqual(len(tokens), 1)
        response = self.track(request_id, tokens[0])
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body['status'], 'Orçamento aprovado')
        self.assertEqual(body['targets'], [self.intake['target']])
        self.assertEqual(body['languages'], [{'target': self.intake['target'], 'status': 'Aguardando início',
                                              'delivery': self.quote['delivery'], 'deliveredAt': None}])
        self.assertEqual([event['status'] for event in body['history']], ['Recebido', 'Orçamento enviado', 'Orçamento aprovado'])
        for private in ('email', 'name', 'message', 'attachments', 'tasks', 'quote', 'trackingTokenDigest', 'quoteResponseTokenDigest'):
            self.assertNotIn(private, body)
        self.assertTrue(all(set(event) == {'status', 'createdAt'} for event in body['history']))
        staff_view = self.client.get(f'/requests/{request_id}', headers=self.headers).json()
        self.assertNotIn('trackingTokenDigest', staff_view)
        self.assertTrue(staff_view['trackingSentAt'])

    def test_invalid_tokens_and_unknown_requests_get_the_same_answer(self):
        request_id, tokens = self.approved_request()
        wrong = self.track(request_id, 'x' * 48)
        unknown = self.track('SOL-NAO-EXISTE', tokens[0])
        self.assertEqual((wrong.status_code, unknown.status_code), (403, 403))
        self.assertEqual(wrong.json(), unknown.json())

    def test_declined_quotes_do_not_issue_tracking_links(self):
        request_id = self.create()
        self.save_quote(request_id)
        quote_tokens = []
        with patch.object(requests_routes, 'deliver_quote', side_effect=lambda data, token, reminder=False: quote_tokens.append(token)):
            quote_id = self.client.post(f'/requests/{request_id}/send-quote', headers=self.headers).json()['quote']['id']
        with patch.object(requests_routes, 'send_tracking_link') as tracking:
            self.client.post(f'/quotes/{quote_id}/decision', json={'token': quote_tokens[0], 'decision': 'decline'})
        tracking.assert_not_called()
        self.assertNotIn('trackingSentAt', self.client.get(f'/requests/{request_id}', headers=self.headers).json())

    def test_internal_review_steps_are_shown_as_translation_progress(self):
        request_id, tokens = self.approved_request()
        self.set_status(request_id, 'Revisão solicitada')
        with db.database() as session:
            session.execute(
                insert(Service).values(
                    id='OS-TRACK',
                    request_id=request_id,
                    title='Test manual',
                    translator_id='USR-1',
                    status='Aguardando avaliação',
                    deadline='2026-12-01',
                    target=self.intake['target'],
                    created_at=db.to_datetime(db.now()),
                )
            )
            requests_routes.add_event(session, 'Ofertas enviadas', request_id=request_id, note='Interno')
        body = self.track(request_id, tokens[0]).json()
        self.assertEqual(body['status'], 'Em andamento')
        self.assertEqual(body['languages'][0]['status'], 'Em revisão')
        self.assertNotIn('Ofertas enviadas', [event['status'] for event in body['history']])

    def test_staff_can_resend_a_new_link_that_replaces_the_previous_one(self):
        request_id, tokens = self.approved_request()
        with patch.object(tracking_routes, 'send_tracking_link', side_effect=lambda data, token, **_: tokens.append(token)):
            resent = self.client.post(f'/requests/{request_id}/send-tracking', headers=self.headers)
        self.assertEqual(resent.status_code, 200, resent.text)
        self.assertEqual(resent.json()['history'][-1]['status'], 'Link de acompanhamento enviado')
        self.assertEqual(self.track(request_id, tokens[0]).status_code, 403)
        self.assertEqual(self.track(request_id, tokens[1]).status_code, 200)

    def test_resend_keeps_the_previous_link_when_delivery_fails_and_requires_approval(self):
        request_id, tokens = self.approved_request()
        with patch.object(tracking_routes, 'send_tracking_link', side_effect=OSError('smtp down')):
            with self.assertRaises(OSError):
                self.client.post(f'/requests/{request_id}/send-tracking', headers=self.headers)
        self.assertEqual(self.track(request_id, tokens[0]).status_code, 200)
        pending = self.create()
        self.assertEqual(self.client.post(f'/requests/{pending}/send-tracking', headers=self.headers).status_code, 409)
        _, translator_headers = self.translator_session()
        self.assertEqual(self.client.post(f'/requests/{request_id}/send-tracking', headers=translator_headers).status_code, 403)
