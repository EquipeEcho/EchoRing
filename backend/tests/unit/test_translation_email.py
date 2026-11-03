"""Shared email templates retain SMTP behavior and identify each language."""
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.services.email import quote_service, service, workflow_service


class TranslationEmailTests(unittest.TestCase):
    def setUp(self):
        self.data = dict(id='SOL-MULTI', name='Cliente', email='client@example.test', title='Manual <técnico>',
                         service='Tradução', source='English', target='Português (Brasil)',
                         targets=['Português (Brasil)', 'Espanhol (Espanha)'], quote=dict(
                             amount='300.30', delivery='2099-01-10', message='Escopo & revisão', items=[
                                 dict(target='Português (Brasil)', amount='100.10', delivery='2099-01-09'),
                                 dict(target='Espanhol (Espanha)', amount='200.20', delivery='2099-01-10')]))

    def test_quote_uses_shared_transport_tls_and_itemized_template(self):
        with patch.dict(os.environ, {'SMTP_HOST': 'smtp.example.test', 'SMTP_FROM': 'staff@example.test',
                                    'SMTP_SECURITY': 'starttls', 'EMAIL_DRY_RUN': 'false'}), patch.object(service.smtplib, 'SMTP') as smtp:
            quote_service.deliver_quote(self.data, 'personal-token')
        connection = smtp.return_value.__enter__.return_value
        connection.starttls.assert_called_once()
        message = connection.send_message.call_args.args[0]
        self.assertEqual(message['To'], self.data['email'])
        html = message.get_body(preferencelist=('html',)).get_content()
        text = message.get_body(preferencelist=('plain',)).get_content()
        self.assertIn('Manual &lt;técnico&gt;', html)
        for content in (html, text):
            self.assertIn('R$ 300,30', content)
            self.assertIn('R$ 100,10', content)
            self.assertIn('Espanhol (Espanha)', content)
            self.assertIn('idiomas que deseja aprovar', content)

    def test_missing_smtp_preserves_existing_503_response(self):
        with patch.dict(os.environ, {'SMTP_HOST': '', 'SMTP_FROM': '', 'EMAIL_DRY_RUN': 'false'}):
            with self.assertRaises(HTTPException) as raised:
                quote_service.deliver_quote(self.data)
        self.assertEqual(raised.exception.status_code, 503)

    def test_language_delivery_does_not_announce_the_entire_order_as_complete(self):
        attachments = [dict(name='espanhol.txt', content=b'Texto', media_type='text/plain')]
        for complete in (False, True):
            with self.subTest(complete=complete), patch.object(workflow_service, 'send_email') as send:
                workflow_service.deliver_translation({**self.data, 'target': 'Espanhol (Espanha)', 'orderComplete': complete}, attachments, object())
            payload = send.call_args.kwargs
            self.assertEqual(payload['attachments'], attachments)
            self.assertIn('Espanhol (Espanha)', payload['subject'])
            self.assertEqual(payload['context']['destino'], 'Espanhol (Espanha)')
            html = service.render_email(payload['template'], payload['context'])
            self.assertIn('Todos os idiomas aprovados' if complete else 'Os demais idiomas aprovados continuam', html)

    def test_single_language_delivery_keeps_its_existing_subject(self):
        data = {**self.data, 'targets': ['Português (Brasil)']}
        with patch.object(workflow_service, 'send_email') as send:
            workflow_service.deliver_translation(data, [], object())
        self.assertEqual(send.call_args.kwargs['subject'], 'Sua tradução está pronta · SOL-MULTI')

    def test_assignment_notification_identifies_the_selected_language(self):
        with patch.object(workflow_service, 'send_email') as send:
            workflow_service.notify_translator_assigned(dict(name='Tradutor', email='translator@example.test'),
                {**self.data, 'target': 'Espanhol (Espanha)'}, 'TRD-SPANISH', '2099-01-10', object())
        self.assertIn('English → Espanhol (Espanha)', send.call_args.kwargs['context']['mensagem'])
