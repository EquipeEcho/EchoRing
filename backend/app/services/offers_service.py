"""Offer persistence, language matching, audit and private serializers.

All offer mutations acquire the request row before offer rows. This also
serializes with the legacy assignment endpoint and the unique service index.
"""

from fastapi import HTTPException

from app.core.languages import language
from app.database_pg import database, json_data, now
from app.repositories.translation_store import read_request


def compatible(account, request):
    profile = json_data(account['profile']) if account.get('profile') else {}
    languages = {language(item.get('name', '')) for item in profile.get('languages', [])
                 if isinstance(item, dict)}
    source, target = language(request['source']), language(request['target'])
    return bool(account['active'] and not account['onboarding_required'] and
                source and target and source != target and {source, target} <= languages)


def translator_accounts(connection):
    return connection.execute('''SELECT users.id, users.name, users.email, users.active,
        users.onboarding_required, translator_profiles.data AS profile FROM users
        LEFT JOIN translator_profiles ON translator_profiles.user_id = users.id
        WHERE users.role = 'translator' ORDER BY LOWER(users.name)''').fetchall()


def notify(connection, offer, user_id, message, href):
    connection.execute('''INSERT INTO offer_notifications (user_id, offer_id, message, href)
        VALUES (?, ?, ?, ?)''', (user_id, offer['id'], message, href))


def transition(connection, offer, status, actor=None, note=''):
    connection.execute('UPDATE job_offers SET status = ?, decided_at = ? WHERE id = ?',
                       (status, now(), offer['id']))
    connection.execute('''INSERT INTO job_offer_events (offer_id, status, actor_id, note)
        VALUES (?, ?, ?, ?)''', (offer['id'], status, actor['id'] if actor else None, note))
    labels = {'accepted': 'aceita', 'declined': 'recusada', 'expired': 'expirada', 'cancelled': 'cancelada'}
    notify(connection, offer, offer['translator_id'], f"Oferta {labels[status]}. {note}", '/oportunidades')
    notify(connection, offer, offer['created_by'], f"Oferta {labels[status]}. {note}", '/solicitacoes')


def expire_request(connection, request_id):
    # Caller holds the request lock; expirations and decisions use the same order.
    expired = connection.execute('''SELECT * FROM job_offers WHERE request_id = ?
        AND status = 'pending' AND expires_at <= clock_timestamp() ORDER BY id FOR UPDATE''',
        (request_id,)).fetchall()
    for offer in expired:
        transition(connection, offer, 'expired', note='Prazo para resposta encerrado.')


def read_offer(connection, offer_id, user):
    row = connection.execute('SELECT * FROM job_offers WHERE id = ?', (offer_id,)).fetchone()
    if not row or (user['role'] == 'translator' and row['translator_id'] != user['id']):
        raise HTTPException(404, 'Oportunidade não encontrada.')
    return row


def offer_record(connection, offer, request, staff=False):
    # Explicit allowlist: never include quote, client contact or other recipients.
    record = {
        'id': offer['id'], 'requestId': offer['request_id'], 'title': request['title'],
        'source': request['source'], 'target': request['target'], 'service': request['service'],
        'compensation': str(offer['compensation']), 'currency': 'BRL',
        'deadline': offer['deadline'], 'expiresAt': offer['expires_at'],
        'description': offer['description'], 'requirements': offer['requirements'],
        'volume': offer['volume'], 'status': offer['status'], 'createdAt': offer['created_at'],
        'audience': offer['audience'], 'workflowTemplateId': offer['workflow_template_id'],
        'decidedAt': offer['decided_at'], 'serviceId': offer['service_id'],
        'attachments': [{'name': file['name'], 'size': file['size']}
                        for file in request.get('attachments', [])],
        'history': connection.execute('''SELECT status, note, created_at AS "createdAt"
            FROM job_offer_events WHERE offer_id = ? ORDER BY id''', (offer['id'],)).fetchall(),
    }
    if staff:
        record['translator'] = connection.execute('SELECT id, name, email FROM users WHERE id = ?',
                                                  (offer['translator_id'],)).fetchone()
    else:
        account = connection.execute('''SELECT users.active, users.onboarding_required,
            translator_profiles.data AS profile FROM users LEFT JOIN translator_profiles
            ON translator_profiles.user_id = users.id WHERE users.id = ?''', (offer['translator_id'],)).fetchone()
        record['eligible'] = compatible(account, request) if account else False
    return record


def expire_pending_offers():
    """Periodic sweep; concurrent API workers safely share the request locks."""
    with database() as connection:
        requests = connection.execute("SELECT DISTINCT request_id FROM job_offers WHERE status = 'pending' AND expires_at <= clock_timestamp() ORDER BY request_id").fetchall()
    for item in requests:
        with database() as connection:
            read_request(connection, item['request_id'], for_update=True)
            expire_request(connection, item['request_id'])
