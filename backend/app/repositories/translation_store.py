"""Translation records, document readers, serialization and persisted events."""
from sqlalchemy import and_, func, insert, or_, select, update
from app.db_models import Delivery, DeliveryFile, Service, TranslationRequest, User, WorkflowEvent
from app.database_pg import to_datetime
import base64
import unicodedata
from fastapi import HTTPException
from app.database_pg import json_data, now
from app.core.translation_scope import aggregate_status, request_targets

ACCENTED = 'áàâãäéèêëíìîïóòôõöúùûüç'
PLAIN = 'aaaaaeeeeiiiiooooouuuuc'
SEARCHABLE_REQUEST = func.translate(
    func.lower(func.concat_ws(
        ' ', TranslationRequest.id,
        *(TranslationRequest.data[field].astext for field in
          ('title', 'name', 'email', 'company', 'source', 'target', 'targets')),
    )), ACCENTED, PLAIN,
)


def search_pattern(search):
    """Normaliza o termo como o SQL e escapa os curingas do LIKE."""
    folded = ''.join(char for char in unicodedata.normalize('NFD', search.strip().lower()) if not unicodedata.combining(char))
    return '%' + folded.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'


def list_requests_page(session, statuses=None, search='', limit=20, offset=0):
    """Filtra e pagina as solicitações no banco e conta os status da busca atual."""
    search_conditions = []
    if search.strip():
        search_conditions.append(SEARCHABLE_REQUEST.ilike(search_pattern(search), escape='\\'))
    conditions = list(search_conditions)
    request_status = TranslationRequest.data['status'].astext
    if statuses:
        conditions.append(request_status.in_(statuses))
    total = session.execute(
        select(func.count()).select_from(TranslationRequest).where(*conditions)
    ).scalar_one()
    rows = session.execute(
        select(TranslationRequest.data).where(*conditions)
        .order_by(TranslationRequest.created_at.desc(), TranslationRequest.id)
        .limit(limit).offset(offset)
    ).mappings().all()
    status_counts = session.execute(
        select(request_status.label('status'), func.count().label('total'))
        .where(*search_conditions).group_by(request_status)
    ).mappings().all()
    return [json_data(row['data']) for row in rows], total, {row['status']: row['total'] for row in status_counts}


def read_request(session, request_id, for_update=False):
    """Busca a solicitação e, quando necessário, bloqueia a linha durante a alteração."""
    statement = select(TranslationRequest.data, TranslationRequest.sending).where(TranslationRequest.id == request_id)
    if for_update:
        statement = statement.with_for_update()
    row = session.execute(statement).mappings().first()
    if not row:
        raise HTTPException(404, 'Solicitação não encontrada.')
    return json_data(row['data']), row['sending']


def read_service(session, service_id, for_update=False):
    """Busca uma tarefa e permite bloquear a linha em mudanças de estado."""
    statement = select(Service.__table__).where(Service.id == service_id)
    if for_update:
        statement = statement.with_for_update()
    service = session.execute(statement).mappings().first()
    if not service:
        raise HTTPException(404, 'Tarefa não encontrada.')
    return service


def delivery_query():
    """Consulta comum das versões e dos responsáveis, incluindo contas ausentes."""
    translator_user = User.__table__.alias('translator_user')
    reviewer = User.__table__.alias('reviewer')
    return (
        select(Delivery.__table__, Service.title.label('service_title'),
               translator_user.c.name.label('translator_name'), reviewer.c.name.label('reviewer_name'))
        .select_from(Delivery.__table__.join(Service.__table__, Service.id == Delivery.service_id)
                     .outerjoin(translator_user, translator_user.c.id == Delivery.translator_id)
                     .outerjoin(reviewer, reviewer.c.id == Delivery.reviewed_by))
    )


def read_delivery(session, delivery_id, for_update=False):
    """Busca uma entrega junto com os nomes do tradutor e de quem revisou."""
    statement = delivery_query().where(Delivery.id == delivery_id)
    if for_update:
        statement = statement.with_for_update(of=Delivery.__table__)
    delivery = session.execute(statement).mappings().first()
    if not delivery:
        raise HTTPException(404, 'Entrega não encontrada.')
    return delivery


def add_event(session, status, request_id=None, service_id=None, actor=None, note=None, created_at=None):
    """Registra uma mudança no histórico com responsável, data e observação."""
    actor_name = actor.get('name') if actor else ('Cliente' if status in ('Orçamento aprovado', 'Orçamento recusado') else 'Sistema')
    session.execute(insert(WorkflowEvent).values(request_id=request_id, service_id=service_id, status=status, note=note or None, actor_id=actor.get('id') if actor else None, actor_name=actor_name, created_at=to_datetime(created_at or now())))


def event_history(session, request_id=None, service_id=None):
    """Monta a linha do tempo completa de uma solicitação ou tarefa."""
    if service_id:
        rows = session.execute(
            select(WorkflowEvent.status, WorkflowEvent.note, WorkflowEvent.actor_name, WorkflowEvent.created_at)
            .where(or_(WorkflowEvent.service_id == service_id, and_(
                WorkflowEvent.service_id.is_(None),
                WorkflowEvent.request_id == select(Service.request_id).where(Service.id == service_id).scalar_subquery(),
            ))).order_by(WorkflowEvent.id)
        ).mappings().all()
    else:
        rows = session.execute(select(WorkflowEvent.status, WorkflowEvent.note, WorkflowEvent.actor_name, WorkflowEvent.created_at).where(WorkflowEvent.request_id == request_id).order_by(WorkflowEvent.id)).mappings().all()
    return [
        {'status': row['status'], 'note': row['note'] or '', 'actorName': row['actor_name'] or 'Sistema', 'createdAt': row['created_at']}
        for row in rows
    ]


def sanitized_request(data, session=None, include_content=False):
    """Prepara a solicitação para resposta sem vazar tokens ou anexos desnecessários."""
    result = {key: value for key, value in data.items() if key not in ('quoteResponseTokenDigest', 'quoteResponseExpiresAt')}
    result['targets'] = request_targets(data)
    result['attachments'] = [file if include_content else {**file, 'content': ''} for file in data.get('attachments', [])]
    if session is not None:
        result['history'] = event_history(session, request_id=data['id'])
        tasks = session.execute(
            select(Service.id, Service.status, Service.source, Service.target, Service.deadline,
                   Service.started_at, Service.delivered_at, User.id.label('translator_id'),
                   User.name.label('translator_name'), User.email.label('translator_email'))
            .select_from(Service.__table__.outerjoin(User.__table__, User.id == Service.translator_id))
            .where(Service.request_id == data['id']).order_by(Service.created_at, Service.id)
        ).mappings().all()
        result['tasks'] = [
            {
                'id': task['id'], 'status': task['status'], 'deadline': task['deadline'],
                'source': task['source'], 'target': task['target'],
                'startedAt': task['started_at'], 'deliveredAt': task['delivered_at'],
                'translator': {'id': task['translator_id'], 'name': task['translator_name'], 'email': task['translator_email']},
            }
            for task in tasks
        ]
        if len(result['targets']) == 1 and result['tasks']:
            result['task'] = result['tasks'][0]
        elif len(result['targets']) > 1:
            for key in ('task', 'taskId', 'translator'):
                result.pop(key, None)
    return result


def update_request_status(session, request_id, status, actor=None, note=None, service_id=None, timestamp_field=None):
    """Atualiza o estado da solicitação e grava o mesmo passo no histórico."""
    data, _ = read_request(session, request_id, for_update=True)
    changed_at = now()
    services = session.execute(select(Service.status, Service.target).where(Service.request_id == request_id)).mappings().all()
    data['status'] = aggregate_status(data, services)
    if timestamp_field:
        if timestamp_field in ('startedAt', 'assignedAt'):
            data.setdefault(timestamp_field, changed_at)
        elif timestamp_field != 'deliveredAt' or data['status'] == 'Entregue':
            data[timestamp_field] = changed_at
    if data['status'] != 'Entregue':
        data.pop('deliveredAt', None)
    session.execute(update(TranslationRequest).values(data=data).where(TranslationRequest.id == request_id))
    if service_id and len(request_targets(data)) > 1:
        service = read_service(session, service_id)
        note = f"{service['source']} → {service['target']}" + (f' · {note}' if note else '')
    add_event(session, status, request_id, service_id, actor, note, changed_at)
    return data


def delivery_documents(session, delivery):
    """Lista todos os arquivos de uma versão e mantém compatibilidade com versões antigas."""
    files = session.execute(select(DeliveryFile.position, DeliveryFile.name, DeliveryFile.media_type, DeliveryFile.size, DeliveryFile.content).where(DeliveryFile.delivery_id == delivery['id']).order_by(DeliveryFile.position)).mappings().all()
    if files:
        return files
    legacy = delivery.get('files') or []
    if isinstance(legacy, str):
        import json
        legacy = json.loads(legacy)
    if legacy:
        return [{'position': position, 'name': file['name'], 'media_type': file['media_type'],
                 'size': file['size'], 'content': base64.b64decode(file['content'], validate=True)}
                for position, file in enumerate(legacy)]
    return [{
        'position': 0, 'name': delivery['name'], 'media_type': delivery['media_type'],
        'size': delivery['size'], 'content': delivery['content'],
    }]


def delivery_record(session, delivery):
    """Formata os metadados da entrega sem devolver o conteúdo binário do arquivo."""
    record = {
        'id': delivery['id'], 'serviceId': delivery['service_id'],
        'serviceTitle': delivery['service_title'], 'version': delivery['version'],
        'translatorName': delivery['translator_name'], 'name': delivery['name'],
        'mediaType': delivery['media_type'], 'size': delivery['size'],
        'status': delivery['status'], 'submittedAt': delivery['submitted_at'],
        'files': [
            {'index': file['position'], 'name': file['name'], 'mediaType': file['media_type'], 'size': file['size']}
            for file in delivery_documents(session, delivery)
        ],
    }
    if delivery['feedback']:
        record['feedback'] = delivery['feedback']
    if delivery['reviewed_at']:
        record['reviewedAt'] = delivery['reviewed_at']
    if delivery['reviewer_name']:
        record['reviewerName'] = delivery['reviewer_name']
    return record


def task_record(session, service):
    """Reúne tarefa, cliente, tradutor, última versão e histórico em uma resposta."""
    from app.services.translation_workflows_service import workflow_record
    request_data = None
    if service['request_id']:
        row = session.execute(select(TranslationRequest.data).where(TranslationRequest.id == service['request_id'])).mappings().first()
        if row:
            request_data = json_data(row['data'])
    latest = session.execute(select(Delivery.__table__).where(Delivery.service_id == service['id']).order_by(Delivery.version.desc()).limit(1)).mappings().first()
    assigned = session.execute(select(User.id, User.name, User.email).where(User.id == service['translator_id'])).mappings().first()
    record = {
        'workflow': workflow_record(session, service['id']),
        'compensation': str(service['translator_compensation']) if service.get('translator_compensation') is not None else None,
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
        latest_files = delivery_documents(session, latest)
        record['lastDelivery'] = {
            'id': latest['id'], 'name': latest['name'], 'size': latest['size'], 'status': latest['status'],
            'version': latest['version'], 'submittedAt': latest['submitted_at'], 'feedback': latest['feedback'] or '',
            'files': [
                {'index': file['position'], 'name': file['name'], 'mediaType': file['media_type'], 'size': file['size']}
                for file in latest_files
            ],
        }
        if latest['feedback']:
            record['lastFeedback'] = latest['feedback']
    if request_data:
        record.update({
            'briefing': request_data.get('message', ''),
            'clientName': request_data['name'], 'clientEmail': request_data['email'],
            'company': request_data.get('company', ''),
            'source': service['source'] or request_data['source'], 'target': service['target'] or request_data['target'],
            'attachments': [{**file, 'content': ''} for file in request_data.get('attachments', [])],
        })
    else:
        record['attachments'] = []
    return record


def _request_for_quote(session, quote_id):
    """Localiza e bloqueia a solicitação ligada ao orçamento respondido pelo cliente."""
    row = session.execute(
        select(TranslationRequest.data)
        .where(TranslationRequest.data['quote']['id'].astext == quote_id).with_for_update()
    ).mappings().first()
    if not row:
        raise HTTPException(404, 'Orçamento não encontrado.')
    return json_data(row['data'])


def original_attachment(session, service, attachment_index):
    """Recupera um anexo original pelo índice dentro da solicitação."""
    if not service['request_id']:
        raise HTTPException(404, 'Documento original não encontrado.')
    data, _ = read_request(session, service['request_id'])
    attachments = data.get('attachments', [])
    if attachment_index < 0 or attachment_index >= len(attachments):
        raise HTTPException(404, 'Documento original não encontrado.')
    return attachments[attachment_index]
