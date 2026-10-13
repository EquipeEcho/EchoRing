import os
import smtplib
import ssl
from pathlib import Path
from email.message import EmailMessage

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).parent / 'templates'

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(['html']),
)


class EmailNotConfiguredError(Exception):
    """SMTP_HOST ou SMTP_FROM não configurados no .env."""


def render_email(template, context=None):
    """Monta o HTML de templates/<template>.html com os dados do context."""
    dados = {'empresa': 'Aliança Traduções', **(context or {})}
    return env.get_template(f'{template}.html').render(**dados)


def _smtp_send(message):
    """Envia uma mensagem usando SSL direto ou STARTTLS conforme o ambiente."""
    host, sender = os.getenv('SMTP_HOST', ''), os.getenv('SMTP_FROM', '')
    if not host or not sender:
        raise EmailNotConfiguredError('O envio de e-mails não foi configurado.')
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


def send_email(to, subject, template, context=None):
    """Função que o resto do sistema chama para mandar e-mail.

    to: e-mail de quem recebe
    subject: assunto
    template: nome do arquivo em templates/ sem .html (ex.: 'aviso')
    context: dados usados no template
    """
    message = EmailMessage()
    message['From'] = os.getenv('SMTP_FROM', '')
    message['To'] = to
    message['Subject'] = subject
    message.set_content('Este e-mail precisa de um leitor com suporte a HTML.')
    message.add_alternative(render_email(template, context), subtype='html')
    _smtp_send(message)