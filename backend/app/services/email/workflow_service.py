"""Assignment notifications and approved translation delivery."""
import logging
import os
from app.services.email.service import send_email

logger = logging.getLogger(__name__)


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
