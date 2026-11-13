"""Offer persistence, language matching, audit and private serializers.

All offer mutations acquire the request row before offer rows. This also
serializes with the legacy assignment endpoint and the unique service index.
"""

from fastapi import HTTPException
from sqlalchemy import and_, func, insert, select, update

from app.core.languages import language
from app.database_pg import database, json_data, now, to_datetime
from app.db_models import (
    JobOffer,
    JobOfferEvent,
    OfferNotification,
    TranslatorProfile,
    User,
)
from app.repositories.translation_store import read_request


def compatible(account, request):
    profile = json_data(account['profile']) if account.get('profile') else {}
    languages = {language(item.get('name', '')) for item in profile.get('languages', []) if isinstance(item, dict)}
    source, target = language(request['source']), language(request['target'])
    return bool(
        account['active']
        and not account['onboarding_required']
        and source
        and target
        and source != target
        and {source, target} <= languages
    )


def translator_accounts(session):
    return (
        session.execute(
            select(
                User.id,
                User.name,
                User.email,
                User.active,
                User.onboarding_required,
                TranslatorProfile.data.label('profile'),
            )
            .outerjoin(TranslatorProfile, TranslatorProfile.user_id == User.id)
            .where(User.role == 'translator')
            .order_by(func.lower(User.name))
        )
        .mappings()
        .all()
    )


def notify(session, offer, user_id, message, href):
    session.execute(insert(OfferNotification).values(user_id=user_id, offer_id=offer['id'], message=message, href=href))


def transition(session, offer, status, actor=None, note=''):
    session.execute(
        update(JobOffer).values(status=status, decided_at=to_datetime(now())).where(JobOffer.id == offer['id'])
    )
    session.execute(
        insert(JobOfferEvent).values(
            offer_id=offer['id'], status=status, actor_id=(actor['id'] if actor else None), note=note
        )
    )
    labels = {'accepted': 'aceita', 'declined': 'recusada', 'expired': 'expirada', 'cancelled': 'cancelada'}
    notify(session, offer, offer['translator_id'], f'Oferta {labels[status]}. {note}', '/oportunidades')
    notify(session, offer, offer['created_by'], f'Oferta {labels[status]}. {note}', '/solicitacoes')


def expire_request(session, request_id):
    # Caller holds the request lock; expirations and decisions use the same order.
    expired = (
        session.execute(
            select(JobOffer.__table__)
            .where(
                and_(
                    JobOffer.request_id == request_id,
                    JobOffer.status == 'pending',
                    JobOffer.expires_at <= func.clock_timestamp(),
                )
            )
            .order_by(JobOffer.id)
            .with_for_update()
        )
        .mappings()
        .all()
    )
    for offer in expired:
        transition(session, offer, 'expired', note='Prazo para resposta encerrado.')


def read_offer(session, offer_id, user):
    row = session.execute(select(JobOffer.__table__).where(JobOffer.id == offer_id)).mappings().first()
    if not row or (user['role'] == 'translator' and row['translator_id'] != user['id']):
        raise HTTPException(404, 'Oportunidade não encontrada.')
    return row


def offer_record(session, offer, request, staff=False):
    request = {**request, 'target': offer['target'] or request['target']}
    # Explicit allowlist: never include quote, client contact or other recipients.
    record = {
        'id': offer['id'],
        'requestId': offer['request_id'],
        'title': request['title'],
        'source': request['source'],
        'target': request['target'],
        'service': request['service'],
        'compensation': str(offer['compensation']),
        'currency': 'BRL',
        'deadline': offer['deadline'],
        'expiresAt': offer['expires_at'],
        'description': offer['description'],
        'requirements': offer['requirements'],
        'volume': offer['volume'],
        'status': offer['status'],
        'createdAt': offer['created_at'],
        'audience': offer['audience'],
        'workflowTemplateId': offer['workflow_template_id'],
        'decidedAt': offer['decided_at'],
        'serviceId': offer['service_id'],
        'attachments': [{'name': file['name'], 'size': file['size']} for file in request.get('attachments', [])],
        'history': session.execute(
            select(JobOfferEvent.status, JobOfferEvent.note, JobOfferEvent.created_at.label('createdAt'))
            .where(JobOfferEvent.offer_id == offer['id'])
            .order_by(JobOfferEvent.id)
        )
        .mappings()
        .all(),
    }
    if staff:
        record['translator'] = (
            session.execute(select(User.id, User.name, User.email).where(User.id == offer['translator_id']))
            .mappings()
            .first()
        )
    else:
        account = (
            session.execute(
                select(User.active, User.onboarding_required, TranslatorProfile.data.label('profile'))
                .outerjoin(TranslatorProfile, TranslatorProfile.user_id == User.id)
                .where(User.id == offer['translator_id'])
            )
            .mappings()
            .first()
        )
        record['eligible'] = compatible(account, request) if account else False
    return record


def expire_pending_offers():
    """Periodic sweep; concurrent API workers safely share the request locks."""
    with database() as session:
        requests = (
            session.execute(
                select(JobOffer.request_id)
                .distinct()
                .where(and_(JobOffer.status == 'pending', JobOffer.expires_at <= func.clock_timestamp()))
                .order_by(JobOffer.request_id)
            )
            .mappings()
            .all()
        )
    for item in requests:
        with database() as session:
            read_request(session, item['request_id'], for_update=True)
            expire_request(session, item['request_id'])
