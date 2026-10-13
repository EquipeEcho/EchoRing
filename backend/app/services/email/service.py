import os
import smtplib
import ssl

from fastapi import HTTPException


def _smtp_send(message):
    """Envia uma mensagem usando SSL direto ou STARTTLS conforme o ambiente."""
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