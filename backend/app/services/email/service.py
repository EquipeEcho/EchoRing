import html
import logging
import os
import re
import smtplib
import ssl
from email.message import EmailMessage
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).parent / 'templates'
logger = logging.getLogger(__name__)

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(['html']),
)


class EmailNotConfiguredError(Exception):
    """SMTP_HOST ou SMTP_FROM não configurados no .env."""


def _html_to_text(content):
    """Gera a versão em texto puro a partir do HTML do template."""
    content = re.sub(r'(?is)<(style|head)\b.*?</\1>', '', content)
    content = re.sub(r'(?is)<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r'\2: \1', content)
    content = re.sub(r'(?i)<br\s*/?>|</(p|div|h[1-6]|tr)>', '\n', content)
    content = html.unescape(re.sub(r'<[^>]+>', '', content))
    linhas = [linha.strip() for linha in content.splitlines()]
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(linhas)).strip() + '\n'


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


def _enviar(message):
    """Envia de verdade, ou só registra no log se EMAIL_DRY_RUN=true."""
    if os.getenv('EMAIL_DRY_RUN', '').lower() == 'true':
        logger.warning('[EMAIL_DRY_RUN] Para: %s | Assunto: %s\n%s',
                       message['To'], message['Subject'],
                       message.get_body(preferencelist=('plain',)).get_content())
        return
    _smtp_send(message)


def _enviar_sem_quebrar(message):
    """Usado em segundo plano: se falhar, só registra no log."""
    try:
        _enviar(message)
    except Exception:
        logger.exception('Falha ao enviar e-mail para %s', message['To'])


def send_email(to, subject, template, context=None, background_tasks=None):
    """Função que o resto do sistema chama para mandar e-mail.

    to: e-mail de quem recebe
    subject: assunto
    template: nome do arquivo em templates/ sem .html (ex.: 'aviso')
    context: dados usados no template
    background_tasks: BackgroundTasks da rota (opcional). Com ele, a resposta
        volta na hora e o e-mail sai depois; falhas só aparecem no log.
    """
    html_body = render_email(template, context)
    message = EmailMessage()
    message['From'] = os.getenv('SMTP_FROM', '')
    message['To'] = to
    message['Subject'] = subject
    message.set_content(_html_to_text(html_body))
    message.add_alternative(html_body, subtype='html')

    if background_tasks is not None:
        background_tasks.add_task(_enviar_sem_quebrar, message)
    else:
        _enviar(message)