"""Email delivery wrapper using app.services.email."""

import os
from decimal import Decimal
from urllib.parse import quote as urlquote

from fastapi import HTTPException

from app.services.email.service import EmailNotConfiguredError, send_email


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