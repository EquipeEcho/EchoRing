"""Email delivery wrapper using app.services.email."""

import base64
import json
import logging
import os
from decimal import Decimal
from urllib.parse import quote as urlquote

from fastapi import HTTPException

from app.services.email.service import EmailNotConfiguredError, send_email

logger = logging.getLogger(__name__)


def deliver_quote(data, response_token=None):
    """Envia o orçamento ao cliente com links pessoais de aprovação e recusa."""
    quote_data = data['quote']
    amount = f"{Decimal(quote_data['amount'].replace(',', '.')):,.2f}".replace(',', '_').replace('.', ',').replace('_', '.')
    quote_id = quote_data.get('id', 'ORCAMENTO')
    frontend = os.getenv('FRONTEND_PUBLIC_URL', 'http://localhost:8081').rstrip('/')
    token = response_token or 'token-nao-disponivel'
    approve_url = f'{frontend}/orcamento/{urlquote(quote_id, safe="")}?decision=approve#{urlquote(token, safe="")}'
    decline_url = f'{frontend}/orcamento/{urlquote(quote_id, safe="")}?decision=decline#{urlquote(token, safe="")}'
    try:
        send_email(
            to=data['email'],
            subject=f"Orçamento Aliança Traduções · {data['id']}",
            template='orcamento',
            context={
                'nome': data['name'], 'titulo': data['title'], 'servico': data['service'],
                'origem': data['source'], 'destino': data['target'], 'valor': amount,
                'prazo': quote_data['delivery'], 'mensagem': quote_data.get('message', ''),
                'aprovar_url': approve_url, 'recusar_url': decline_url, 'protocolo': data['id'],
            },
        )
    except EmailNotConfiguredError as error:
        raise HTTPException(503, 'O envio de e-mails não foi configurado. Os dados continuam salvos.') from error


def _frontend_url():
    return os.getenv('FRONTEND_PUBLIC_URL', 'http://localhost:8081').rstrip('/')


def notify_translator_assigned(translator, data, task_id, deadline, background_tasks):
    """Avisa o tradutor que ele recebeu uma nova tradução para aceitar no portal."""
    try:
        send_email(
            to=translator['email'],
            subject=f'Nova tradução atribuída · {task_id}',
            template='aviso',
            context={
                'titulo': 'Você recebeu uma nova tradução',
                'nome': translator['name'],
                'mensagem': (
                    f"Serviço: {data['title']}\n"
                    f"Idiomas: {data['source']} → {data['target']}\n"
                    f"Prazo: {deadline or 'a combinar'}\n\n"
                    'Acesse o portal para aceitar e iniciar a tradução.'
                ),
                'botao_texto': 'Ver tarefa',
                'botao_url': f'{_frontend_url()}/tarefas',
            },
            background_tasks=background_tasks,
        )
    except Exception:
        logger.exception('Não foi possível avisar o tradutor da tarefa %s', task_id)


def delivery_attachments(delivery):
    """Monta a lista de anexos a partir dos arquivos salvos na entrega."""
    files = delivery.get('files') or []
    if isinstance(files, str):
        files = json.loads(files)
    if files:
        return [
            {
                'name': item['name'],
                'content': base64.b64decode(item['content']),
                'media_type': item.get('media_type') or 'application/octet-stream',
            }
            for item in files
        ]
    return [{'name': delivery['name'], 'content': bytes(delivery['content']), 'media_type': delivery['media_type']}]


def deliver_translation(data, attachments, background_tasks):
    """Envia ao cliente a tradução aprovada pela equipe, com os arquivos em anexo."""
    try:
        send_email(
            to=data['email'],
            subject=f"Sua tradução está pronta · {data['id']}",
            template='entrega',
            context={
                'nome': data['name'], 'titulo': data['title'], 'origem': data['source'],
                'destino': data['target'], 'protocolo': data['id'],
            },
            attachments=attachments,
            background_tasks=background_tasks,
        )
    except Exception:
        logger.exception('Não foi possível enviar a tradução da solicitação %s', data['id'])
