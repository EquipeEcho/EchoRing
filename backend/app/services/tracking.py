"""Client order tracking: personal read-only links and the public view of a request."""
import hashlib
import hmac
import secrets

from fastapi import HTTPException

from app.core.translation_scope import work_targets
from app.database_pg import now

# Statuses that only make sense to the team are shown to the client as the stage they belong to.
PUBLIC_STATUS = {'Aguardando avaliação': 'Em andamento', 'Revisão solicitada': 'Em andamento'}
PUBLIC_TASK_STATUS = {
    'Tradutor atribuído': 'Em tradução', 'Em andamento': 'Em tradução',
    'Aguardando avaliação': 'Em revisão', 'Revisão solicitada': 'Em revisão',
}
PUBLIC_EVENTS = {'Recebido', 'Orçamento enviado', 'Orçamento aprovado', 'Tradutor atribuído', 'Em andamento', 'Pronta', 'Entregue'}
TRACKABLE_STATUSES = {
    'Orçamento aprovado', 'Tradutor atribuído', 'Em andamento', 'Aguardando avaliação',
    'Revisão solicitada', 'Pronta', 'Entregue',
}


def _digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def issue_tracking_token(data):
    """Gera um link novo; somente o hash fica salvo, e o link anterior deixa de valer."""
    token = secrets.token_urlsafe(48)
    data.update(trackingTokenDigest=_digest(token), trackingSentAt=now())
    return token


def authorized_tracking(data, token):
    """Confere o token sem revelar se a solicitação existe."""
    digest = data.get('trackingTokenDigest') if data else None
    if not digest or not hmac.compare_digest(_digest(token), digest):
        raise HTTPException(403, 'Este link de acompanhamento é inválido. Use o link mais recente recebido por e-mail.')
    return data


def public_tracking(request):
    """Reduz a solicitação já sanitizada ao que o cliente pode ver: sem tradutores, notas ou valores internos."""
    approved = work_targets(request)
    quote = request.get('quote') or {}
    items = {item['target']: item for item in quote.get('items', [])}
    tasks = {task.get('target') or request['target']: task for task in request.get('tasks', [])}
    languages = []
    for target in approved:
        task = tasks.get(target)
        status = task['status'] if task else 'Aguardando início'
        languages.append({
            'target': target,
            'status': PUBLIC_TASK_STATUS.get(status, status),
            'delivery': (items.get(target) or {}).get('delivery') or quote.get('delivery', ''),
            'deliveredAt': task.get('deliveredAt') if task else None,
        })
    return {
        'id': request['id'],
        'title': request['title'],
        'service': request['service'],
        'source': request['source'],
        'targets': approved,
        'status': PUBLIC_STATUS.get(request['status'], request['status']),
        'createdAt': request['createdAt'],
        'emailSentAt': request.get('emailSentAt'),
        'quoteRespondedAt': request.get('quoteRespondedAt'),
        'approvedAmount': request.get('approvedAmount'),
        'delivery': quote.get('delivery', ''),
        'languages': languages,
        'history': [
            {'status': event['status'], 'createdAt': event['createdAt']}
            for event in request.get('history', []) if event['status'] in PUBLIC_EVENTS
        ],
    }
