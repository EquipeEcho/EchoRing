"""Order confirmation email with the client's personal tracking link."""
import logging
import os
from datetime import date
from urllib.parse import quote as urlquote

from fastapi import HTTPException

from app.core.translation_scope import work_targets
from app.services.email.quote_service import money
from app.services.email.service import EmailNotConfiguredError, send_email

logger = logging.getLogger(__name__)


def tracking_url(request_id, token):
    """O token vai no fragmento para não aparecer em logs de servidores e proxies."""
    frontend = os.getenv('FRONTEND_PUBLIC_URL', 'http://localhost:8081').rstrip('/')
    return f'{frontend}/acompanhar/{urlquote(request_id, safe="")}#{urlquote(token, safe="")}'


def _readable_date(value):
    try:
        return date.fromisoformat(value).strftime('%d/%m/%Y')
    except (TypeError, ValueError):
        return value or ''


def send_tracking_link(data, token, background_tasks=None, resend=False):
    """Envia o link de acompanhamento; falhas no envio inicial só ficam no log."""
    quote = data.get('quote') or {}
    try:
        send_email(
            to=data['email'],
            subject=f"{'Seu link de acompanhamento' if resend else 'Pedido confirmado'} · {data['id']}",
            template='acompanhamento',
            context={
                'nome': data['name'], 'titulo': data['title'], 'protocolo': data['id'],
                'origem': data['source'], 'destino': ', '.join(work_targets(data)),
                'valor': money(data['approvedAmount']) if data.get('approvedAmount') else '',
                'prazo': _readable_date(quote.get('delivery')), 'reenvio': resend,
                'acompanhar_url': tracking_url(data['id'], token),
            },
            background_tasks=background_tasks,
        )
    except EmailNotConfiguredError as error:
        if resend:
            raise HTTPException(503, 'O envio de e-mails não foi configurado.') from error
        logger.warning('E-mail de acompanhamento não enviado para %s: SMTP não configurado.', data['id'])
    except Exception:
        if resend:
            raise
        logger.exception('Não foi possível enviar o acompanhamento da solicitação %s', data['id'])
