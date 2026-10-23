"""Database readers, workflow event logging and record serializers."""

from fastapi import HTTPException
from sqlalchemy import insert, or_, select, update
from sqlalchemy.orm import aliased

from app.database_pg import json_data, now, to_datetime
from app.db_models import Delivery, Service, TranslationRequest, User, WorkflowEvent


def read_request(session, request_id, for_update=False):
    stmt = select(TranslationRequest.data, TranslationRequest.sending).where(TranslationRequest.id == request_id)
    if for_update:
        stmt = stmt.with_for_update()
    row = session.execute(stmt).mappings().first()
    if not row:
        raise HTTPException(404, 'Solicitação não encontrada.')
    return json_data(row['data']), row['sending']


def request_exists(session, request_id):
    return session.execute(select(TranslationRequest.id).where(TranslationRequest.id == request_id)).first() is not None


def read_service(session, service_id, for_update=False):
    stmt = select(Service.__table__).where(Service.id == service_id)
    if for_update:
        stmt = stmt.with_for_update()
    service = session.execute(stmt).mappings().first()
    if not service:
        raise HTTPException(404, 'Tarefa não encontrada.')
    return service


def delivery_query():
    """SELECT base de entregas com título da tarefa e nomes do tradutor e do avaliador."""
    translator_user = aliased(User)
    reviewer = aliased(User)
    return (
        select(
            Delivery.__table__,
            Service.title.label('service_title'),
            translator_user.name.label('translator_name'),
            reviewer.name.label('reviewer_name'),
        )
        .select_from(Delivery)
        .join(Service, Service.id == Delivery.service_id)
        .outerjoin(translator_user, translator_user.id == Delivery.translator_id)
        .outerjoin(reviewer, reviewer.id == Delivery.reviewed_by)
    )


def read_delivery(session, delivery_id, for_update=False):
    stmt = delivery_query().where(Delivery.id == delivery_id)
    if for_update:
        # OF deliveries: o PostgreSQL não permite bloquear o lado nulo de um outer join.
        stmt = stmt.with_for_update(of=Delivery.__table__)
    delivery = session.execute(stmt).mappings().first()
    if not delivery:
        raise HTTPException(404, 'Entrega não encontrada.')
    return delivery


def add_event(session, status, request_id=None, service_id=None, actor=None, note=None, created_at=None):
    actor_name = actor.get('name') if actor else ('Cliente' if status in ('Orçamento aprovado', 'Orçamento recusado') else 'Sistema')
    session.execute(
        insert(WorkflowEvent).values(
            request_id=request_id,
            service_id=service_id,
            status=status,
            note=note or None,
            actor_id=actor.get('id') if actor else None,
            actor_name=actor_name,
            created_at=to_datetime(created_at or now()),
        )
    )


def event_history(session, request_id=None, service_id=None):
    stmt = select(WorkflowEvent.status, WorkflowEvent.note, WorkflowEvent.actor_name, WorkflowEvent.created_at)
    if service_id:
        parent_request = select(Service.request_id).where(Service.id == service_id).scalar_subquery()
        stmt = stmt.where(or_(WorkflowEvent.service_id == service_id, WorkflowEvent.request_id == parent_request))
    else:
        stmt = stmt.where(WorkflowEvent.request_id == request_id)
    rows = session.execute(stmt.order_by(WorkflowEvent.id)).mappings().all()
    return [
        {'status': row['status'], 'note': row['note'] or '', 'actorName': row['actor_name'] or 'Sistema', 'createdAt': row['created_at']}
        for row in rows
    ]


def sanitized_request(data, session=None, include_content=False):
    result = {key: value for key, value in data.items() if key not in ('quoteResponseTokenDigest', 'quoteResponseExpiresAt')}
    result['attachments'] = [file if include_content else {**file, 'content': ''} for file in data.get('attachments', [])]
    if session is not None:
        result['history'] = event_history(session, request_id=data['id'])
        task = session.execute(
            select(
                Service.id,
                Service.status,
                Service.deadline,
                User.id.label('translator_id'),
                User.name.label('translator_name'),
                User.email.label('translator_email'),
            )
            .select_from(Service)
            .outerjoin(User, User.id == Service.translator_id)
            .where(Service.request_id == data['id'])
        ).mappings().first()
        if task:
            result['task'] = {
                'id': task['id'], 'status': task['status'], 'deadline': task['deadline'],
                'translator': {'id': task['translator_id'], 'name': task['translator_name'], 'email': task['translator_email']},
            }
    return result


def update_request_status(session, request_id, status, actor=None, note=None, service_id=None, timestamp_field=None):
    data, _ = read_request(session, request_id, for_update=True)
    changed_at = now()
    data['status'] = status
    if timestamp_field:
        data[timestamp_field] = changed_at
    session.execute(update(TranslationRequest).where(TranslationRequest.id == request_id).values(data=data))
    add_event(session, status, request_id, service_id, actor, note, changed_at)
    return data


def delivery_files_list(delivery):
    raw_files = delivery.get('files')
    if raw_files:
        parsed = json_data(raw_files) if isinstance(raw_files, str) else raw_files
        if parsed:
            return [
                {
                    'index': idx,
                    'name': item['name'],
                    'size': item['size'],
                    'mediaType': item.get('media_type') or item.get('mediaType', 'application/octet-stream'),
                }
                for idx, item in enumerate(parsed)
            ]
    return [
        {
            'index': 0,
            'name': delivery['name'],
            'size': delivery['size'],
            'mediaType': delivery['media_type'],
        }
    ]


def delivery_record(delivery):
    record = {
        'id': delivery['id'], 'serviceId': delivery['service_id'],
        'serviceTitle': delivery['service_title'], 'version': delivery['version'],
        'translatorName': delivery['translator_name'], 'name': delivery['name'],
        'mediaType': delivery['media_type'], 'size': delivery['size'],
        'status': delivery['status'], 'submittedAt': delivery['submitted_at'],
        'files': delivery_files_list(delivery),
    }
    if delivery['feedback']:
        record['feedback'] = delivery['feedback']
    if delivery['reviewed_at']:
        record['reviewedAt'] = delivery['reviewed_at']
    if delivery['reviewer_name']:
        record['reviewerName'] = delivery['reviewer_name']
    return record


def task_record(session, service):
    request_data = None
    if service['request_id']:
        row = session.execute(select(TranslationRequest.data).where(TranslationRequest.id == service['request_id'])).mappings().first()
        if row:
            request_data = json_data(row['data'])
    latest = session.execute(
        select(Delivery.__table__).where(Delivery.service_id == service['id']).order_by(Delivery.version.desc()).limit(1)
    ).mappings().first()
    assigned = session.execute(select(User.id, User.name, User.email).where(User.id == service['translator_id'])).mappings().first()
    record = {
        'id': service['id'], 'requestId': service['request_id'], 'title': service['title'],
        'status': service['status'], 'deadline': service['deadline'], 'createdAt': service['created_at'],
        'updatedAt': service['updated_at'] or service['created_at'], 'startedAt': service['started_at'],
        'readyAt': service['ready_at'], 'deliveredAt': service['delivered_at'],
        'observations': service['observations'] or '', 'source': service['source'] or '',
        'target': service['target'] or '', 'lastVersion': latest['version'] if latest else 0,
        'translator': {'id': assigned['id'], 'name': assigned['name'], 'email': assigned['email']} if assigned else None,
        'history': event_history(session, service_id=service['id']),
    }
    if latest:
        record['lastDelivery'] = {
            'id': latest['id'], 'name': latest['name'], 'size': latest['size'], 'status': latest['status'],
            'version': latest['version'], 'submittedAt': latest['submitted_at'], 'feedback': latest['feedback'] or '',
            'files': delivery_files_list(latest),
        }
        if latest['feedback']:
            record['lastFeedback'] = latest['feedback']
    if request_data:
        record.update({
            'clientName': request_data['name'], 'clientEmail': request_data['email'],
            'company': request_data.get('company', ''),
            'source': service['source'] or request_data['source'], 'target': service['target'] or request_data['target'],
            'attachments': [{**file, 'content': ''} for file in request_data.get('attachments', [])],
        })
    else:
        record['attachments'] = []
    return record


def ensure_task_access(service, user):
    if user['role'] in ('admin', 'employee'):
        return
    if user['role'] != 'translator' or service['translator_id'] != user['id']:
        raise HTTPException(403, 'Esta tarefa não está atribuída à sua conta.')


def _request_for_quote(session, quote_id):
    # data -> 'quote' ->> 'id' = :quote_id (JSONB), com bloqueio da linha.
    row = session.execute(
        select(TranslationRequest.data)
        .where(TranslationRequest.data['quote']['id'].astext == quote_id)
        .with_for_update()
    ).mappings().first()
    if not row:
        raise HTTPException(404, 'Orçamento não encontrado.')
    return json_data(row['data'])


def original_attachment(session, service, attachment_index):
    if not service['request_id']:
        raise HTTPException(404, 'Documento original não encontrado.')
    data, _ = read_request(session, service['request_id'])
    attachments = data.get('attachments', [])
    if attachment_index < 0 or attachment_index >= len(attachments):
        raise HTTPException(404, 'Documento original não encontrado.')
    return attachments[attachment_index]