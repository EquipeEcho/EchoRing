"""HTTP integration coverage for attention alerts and resending unanswered quotes."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from zoneinfo import ZoneInfo

from sqlalchemy import func, insert, update

from app import database_pg as db
from app.db_models import Service, TranslationRequest
from app.routes import requests_routes
from tests.support.portal_test_case import PortalTestCase


def iso(**delta):
    return (datetime.now(timezone.utc) + timedelta(**delta)).isoformat()


def day(offset):
    return (datetime.now(ZoneInfo('America/Sao_Paulo')).date() + timedelta(days=offset)).isoformat()


class RequestAlertTests(PortalTestCase):
    def stored(self, status, created_days_ago=0, **fields):
        """Cria a solicitação pela API e ajusta etapa, datas e campos diretamente no banco."""
        request_id = self.create()
        with db.database() as session:
            data, _ = requests_routes.read_request(session, request_id)
            data.update(status=status, **fields)
            session.execute(
                update(TranslationRequest)
                .where(TranslationRequest.id == request_id)
                .values(data=data, created_at=func.now() - timedelta(days=created_days_ago))
            )
        return request_id

    def add_service(self, request_id, deadline, status='Em andamento', target='Inglês'):
        with db.database() as session:
            session.execute(
                insert(Service).values(
                    id='OS-' + request_id + target[:3],
                    request_id=request_id,
                    title='Test manual',
                    translator_id='USR-1',
                    status=status,
                    deadline=deadline,
                    target=target,
                    created_at=db.to_datetime(db.now()),
                )
            )

    def attention_ids(self, **params):
        response = self.client.get('/requests', headers=self.headers, params={'attention': 'true', **params})
        self.assertEqual(response.status_code, 200, response.text)
        return {item['id'] for item in response.json()['items']}

    def test_flags_stalled_requests_quotes_and_deadlines(self):
        quote = {**self.quote, 'delivery': day(10)}
        stale = self.stored('Recebido', created_days_ago=3)
        fresh = self.stored('Recebido', deadline='5 dias úteis')
        unanswered = self.stored('Orçamento enviado', quote=quote, emailSentAt=iso(days=-4), quoteResponseExpiresAt=iso(days=20))
        expiring = self.stored('Orçamento enviado', quote=quote, emailSentAt=iso(days=-1), quoteResponseExpiresAt=iso(days=2))
        waiting = self.stored('Orçamento enviado', quote=quote, emailSentAt=iso(days=-1), quoteResponseExpiresAt=iso(days=20))
        urgent_client = self.stored('Em análise', deadline=day(1))
        late_quote = self.stored('Orçamento aprovado', quote={**quote, 'delivery': day(-2)})
        task_tomorrow = self.stored('Em andamento', quote=quote)
        self.add_service(task_tomorrow, day(1))
        task_later = self.stored('Em andamento', quote=quote)
        self.add_service(task_later, day(1), status='Entregue')
        self.add_service(task_later, day(7), target='Espanhol')
        finished = self.stored('Entregue', quote={**quote, 'delivery': day(-5)})

        flagged = {stale, unanswered, expiring, urgent_client, late_quote, task_tomorrow}
        self.assertEqual(self.attention_ids(), flagged)
        self.assertNotIn(fresh, flagged)
        self.assertNotIn(waiting, flagged)
        self.assertNotIn(task_later, flagged)
        self.assertNotIn(finished, flagged)
        self.assertEqual(self.attention_ids(status='orcamento'), {unanswered, expiring, urgent_client, late_quote})
        counts = self.client.get('/requests', headers=self.headers, params={'limit': 1}).json()['counts']
        self.assertEqual(counts['attention'], len(flagged))

    def test_listing_exposes_quote_link_expiry_without_the_token_digest(self):
        expires = iso(days=5)
        self.stored('Orçamento enviado', quote=self.quote, quoteResponseTokenDigest='secret', quoteResponseExpiresAt=expires)
        item = self.client.get('/requests', headers=self.headers).json()['items'][0]
        self.assertEqual(item['quoteExpiresAt'], expires)
        self.assertNotIn('quoteResponseTokenDigest', item)
        self.assertNotIn('quoteResponseExpiresAt', item)

    def test_resend_issues_a_new_link_and_invalidates_the_previous_one(self):
        request_id = self.create()
        self.save_quote(request_id)
        tokens = []

        def capture(data, token, reminder=False):
            tokens.append((token, reminder))

        with patch.object(requests_routes, 'deliver_quote', side_effect=capture):
            sent = self.client.post(f'/requests/{request_id}/send-quote', headers=self.headers).json()
            resent = self.client.post(f'/requests/{request_id}/resend-quote', headers=self.headers)
        self.assertEqual(resent.status_code, 200, resent.text)
        body = resent.json()
        quote_id = sent['quote']['id']
        (first, _), (second, reminder) = tokens
        self.assertTrue(reminder)
        self.assertNotEqual(first, second)
        preview = f'/quotes/{quote_id}/preview'
        self.assertEqual(self.client.post(preview, json={'token': first}).status_code, 403)
        self.assertEqual(self.client.post(preview, json={'token': second}).status_code, 200)
        self.assertEqual(body['status'], 'Orçamento enviado')
        self.assertGreater(body['emailSentAt'], sent['emailSentAt'])
        self.assertEqual(body['quoteResentAt'], body['emailSentAt'])
        self.assertGreater(body['quoteExpiresAt'], body['emailSentAt'])
        self.assertEqual(body['history'][-1]['status'], 'Orçamento reenviado')

    def test_resend_keeps_the_previous_link_when_delivery_fails(self):
        request_id = self.create()
        self.save_quote(request_id)
        tokens = []
        with patch.object(requests_routes, 'deliver_quote', side_effect=lambda data, token, reminder=False: tokens.append(token)):
            quote_id = self.client.post(f'/requests/{request_id}/send-quote', headers=self.headers).json()['quote']['id']
        with patch.object(requests_routes, 'deliver_quote', side_effect=OSError('smtp down')):
            failed = self.client.post(f'/requests/{request_id}/resend-quote', headers=self.headers)
        self.assertEqual(failed.status_code, 502)
        self.assertEqual(self.client.post(f'/quotes/{quote_id}/preview', json={'token': tokens[0]}).status_code, 200)
        detail = self.client.get(f'/requests/{request_id}', headers=self.headers).json()
        self.assertNotIn('Orçamento reenviado', [event['status'] for event in detail['history']])

    def test_resend_is_limited_to_unanswered_quotes_and_staff(self):
        request_id = self.create()
        self.assertEqual(self.client.post(f'/requests/{request_id}/resend-quote', headers=self.headers).status_code, 409)
        self.assertEqual(self.client.post(f'/requests/{request_id}/resend-quote').status_code, 401)
        _, translator_headers = self.translator_session()
        self.assertEqual(self.client.post(f'/requests/{request_id}/resend-quote', headers=translator_headers).status_code, 403)
