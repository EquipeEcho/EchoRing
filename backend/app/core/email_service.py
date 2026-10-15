"""SMTP email delivery for translation quotes and final documents."""

import os
import smtplib
import ssl
from decimal import Decimal
from email.message import EmailMessage
from urllib.parse import quote as urlquote

from fastapi import HTTPException


def _smtp_send(message):
    host, sender = os.getenv('SMTP_HOST', ''), os.getenv('SMTP_FROM', '')
    if not host or not sender:
        raise HTTPException(503, 'O envio de e-mails não foi configurado. Os dados continuam salvos.')
    context = ssl.create_default_context()
    implicit_tls = os.getenv('SMTP_SECURITY', 'starttls').lower() == 'ssl'
    factory = smtplib.SMTP_SSL if implicit_tls else smtplib.SMTP
    port = int(os.getenv('SMTP_PORT', '465' if implicit_tls else '587'))
    kwargs = {'context': context} if implicit_tls else {}
    with factory(host, port, timeout=15, **kwargs) as smtp:
        if not implicit_tls:
            smtp.starttls(context=context)
        if os.getenv('SMTP_USER'):
            smtp.login(os.environ['SMTP_USER'], os.getenv('SMTP_PASSWORD', ''))
        smtp.send_message(message)


def deliver_quote(data, response_token=None):
    quote_data = data['quote']
    amount = f"{Decimal(quote_data['amount'].replace(',', '.')):,.2f}".replace(',', '_').replace('.', ',').replace('_', '.')
    quote_id = quote_data.get('id', 'ORCAMENTO')
    frontend = os.getenv('FRONTEND_PUBLIC_URL', 'http://localhost:8081').rstrip('/')
    token = response_token or 'token-nao-disponivel'
    approve_url = f'{frontend}/orcamento/{urlquote(quote_id, safe="")}?decision=approve#{urlquote(token, safe="")}'
    decline_url = f'{frontend}/orcamento/{urlquote(quote_id, safe="")}?decision=decline#{urlquote(token, safe="")}'
    optional_message = f"\nMensagem da equipe: {quote_data['message']}\n" if quote_data.get('message') else ''
    message = EmailMessage()
    message['From'] = os.getenv('SMTP_FROM', '')
    message['To'] = data['email']
    message['Subject'] = f"Orçamento Aliança Traduções · {data['id']}"
    message.set_content(
        f"Olá, {data['name']}!\n\nSegue nossa proposta para {data['title']}.\n\n"
        f"Serviço: {data['service']}\nIdiomas: {data['source']} → {data['target']}\n"
        f"Valor: R$ {amount}\nPrazo: {quote_data['delivery']}\n{optional_message}\n"
        f"Aprovar orçamento: {approve_url}\nRecusar orçamento: {decline_url}\n\n"
        f"Os links são pessoais e devem ser usados apenas por você.\n\nAliança Traduções\nProtocolo: {data['id']}"
    )
    message.add_alternative(
        f"<h2>Orçamento para {data['title']}</h2><p><strong>Serviço:</strong> {data['service']}<br>"
        f"<strong>Idiomas:</strong> {data['source']} → {data['target']}<br>"
        f"<strong>Valor:</strong> R$ {amount}<br><strong>Prazo:</strong> {quote_data['delivery']}</p>"
        f"<p>{quote_data.get('message', '')}</p><p><a href=\"{approve_url}\">Aprovar orçamento</a> &nbsp; "
        f"<a href=\"{decline_url}\">Recusar orçamento</a></p><p>Protocolo: {data['id']}</p>",
        subtype='html',
    )
    _smtp_send(message)


def deliver_final(data, task, delivery):
    message = EmailMessage()
    message['From'] = os.getenv('SMTP_FROM', '')
    message['To'] = data['email']
    message['Subject'] = f"Tradução concluída · {data['id']}"
    message.set_content(
        f"Olá, {data['name']}!\n\nA tradução de {data['title']} foi concluída e está anexada a este e-mail.\n\n"
        f"Idiomas: {data['source']} → {data['target']}\nArquivo: {delivery['name']}\n\n"
        f"Aliança Traduções\nProtocolo: {data['id']}\nTarefa: {task['id']}"
    )
    maintype, _, subtype = delivery['media_type'].partition('/')
    subtype = subtype.split(';', 1)[0] or 'octet-stream'
    if maintype not in ('application', 'text'):
        maintype, subtype = 'application', 'octet-stream'
    message.add_attachment(bytes(delivery['content']), maintype=maintype, subtype=subtype, filename=delivery['name'])
    _smtp_send(message)