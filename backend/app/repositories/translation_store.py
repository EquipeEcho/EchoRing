"""Translation records, document readers, serialization and persisted events."""
import base64
from fastapi import HTTPException
from psycopg.types.json import Jsonb
from app.database_pg import json_data, now

def read_request(connection, request_id, for_update=False):
    """Busca a solicitação e, quando necessário, bloqueia a linha durante a alteração."""
    suffix = ' FOR UPDATE' if for_update else ''
    row = connection.execute('SELECT data, sending FROM requests WHERE id = ?' + suffix, (request_id,)).fetchone()
    if not row:
        raise HTTPException(404, 'Solicitação não encontrada.')
    return json_data(row['data']), row['sending']


def read_service(connection, service_id, for_update=False):
    """Busca uma tarefa e permite bloquear a linha em mudanças de estado."""
    suffix = ' FOR UPDATE' if for_update else ''
    service = connection.execute('SELECT * FROM services WHERE id = ?' + suffix, (service_id,)).fetchone()
    if not service:
        raise HTTPException(404, 'Tarefa não encontrada.')
    return service


def read_delivery(connection, delivery_id, for_update=False):
    """Busca uma entrega junto com os nomes do tradutor e de quem revisou."""
    suffix = ' FOR UPDATE OF deliveries' if for_update else ''
    delivery = connection.execute(
        '''SELECT deliveries.*, services.title AS service_title,
                  translator_user.name AS translator_name, reviewer.name AS reviewer_name
           FROM deliveries JOIN services ON services.id = deliveries.service_id
           LEFT JOIN users AS translator_user ON translator_user.id = deliveries.translator_id
           LEFT JOIN users AS reviewer ON reviewer.id = deliveries.reviewed_by
           WHERE deliveries.id = ?''' + suffix,
        (delivery_id,),
    ).fetchone()
    if not delivery:
        raise HTTPException(404, 'Entrega não encontrada.')
    return delivery


def add_event(connection, status, request_id=None, service_id=None, actor=None, note=None, created_at=None):
    """Registra uma mudança no histórico com responsável, data e observação."""
    actor_name = actor.get('name') if actor else ('Cliente' if status in ('Orçamento aprovado', 'Orçamento recusado') else 'Sistema')
    connection.execute(
        '''INSERT INTO workflow_events (request_id, service_id, status, note, actor_id, actor_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (request_id, service_id, status, note or None, actor.get('id') if actor else None,
         actor_name, created_at or now()),
    )


def event_history(connection, request_id=None, service_id=None):
    """Monta a linha do tempo completa de uma solicitação ou tarefa."""
    if service_id:
        rows = connection.execute(
            'SELECT status, note, actor_name, created_at FROM workflow_events WHERE service_id = ? OR request_id = (SELECT request_id FROM services WHERE id = ?) ORDER BY id',
            (service_id, service_id),
        ).fetchall()
    else:
        rows = connection.execute(
            'SELECT status, note, actor_name, created_at FROM workflow_events WHERE request_id = ? ORDER BY id',
            (request_id,),
        ).fetchall()
    return [
        {'status': row['status'], 'note': row['note'] or '', 'actorName': row['actor_name'] or 'Sistema', 'createdAt': row['created_at']}
        for row in rows
    ]


def sanitized_request(data, connection=None, include_content=False):
    """Prepara a solicitação para resposta sem vazar tokens ou anexos desnecessários."""
    result = {key: value for key, value in data.items() if key not in ('quoteResponseTokenDigest', 'quoteResponseExpiresAt')}
    result['attachments'] = [file if include_content else {**file, 'content': ''} for file in data.get('attachments', [])]
    if connection:
        result['history'] = event_history(connection, request_id=data['id'])
        task = connection.execute(
            '''SELECT services.id, services.status, services.deadline, users.id AS translator_id,
                      users.name AS translator_name, users.email AS translator_email
               FROM services LEFT JOIN users ON users.id = services.translator_id
               WHERE services.request_id = ?''',
            (data['id'],),
        ).fetchone()
        if task:
            result['task'] = {
                'id': task['id'], 'status': task['status'], 'deadline': task['deadline'],
                'translator': {'id': task['translator_id'], 'name': task['translator_name'], 'email': task['translator_email']},
            }
    return result


def update_request_status(connection, request_id, status, actor=None, note=None, service_id=None, timestamp_field=None):
    """Atualiza o estado da solicitação e grava o mesmo passo no histórico."""
    data, _ = read_request(connection, request_id, for_update=True)
    changed_at = now()
    data['status'] = status
    if timestamp_field:
        data[timestamp_field] = changed_at
    connection.execute('UPDATE requests SET data = ? WHERE id = ?', (Jsonb(data), request_id))
    add_event(connection, status, request_id, service_id, actor, note, changed_at)
    return data


def delivery_documents(connection, delivery):
    """Lista todos os arquivos de uma versão e mantém compatibilidade com versões antigas."""
    files = connection.execute(
        'SELECT position, name, media_type, size, content FROM delivery_files WHERE delivery_id = ? ORDER BY position',
        (delivery['id'],),
    ).fetchall()
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


def delivery_record(connection, delivery):
    """Formata os metadados da entrega sem devolver o conteúdo binário do arquivo."""
    record = {
        'id': delivery['id'], 'serviceId': delivery['service_id'],
        'serviceTitle': delivery['service_title'], 'version': delivery['version'],
        'translatorName': delivery['translator_name'], 'name': delivery['name'],
        'mediaType': delivery['media_type'], 'size': delivery['size'],
        'status': delivery['status'], 'submittedAt': delivery['submitted_at'],
        'files': [
            {'index': file['position'], 'name': file['name'], 'mediaType': file['media_type'], 'size': file['size']}
            for file in delivery_documents(connection, delivery)
        ],
    }
    if delivery['feedback']:
        record['feedback'] = delivery['feedback']
    if delivery['reviewed_at']:
        record['reviewedAt'] = delivery['reviewed_at']
    if delivery['reviewer_name']:
        record['reviewerName'] = delivery['reviewer_name']
    return record


def task_record(connection, service):
    """Reúne tarefa, cliente, tradutor, última versão e histórico em uma resposta."""
    from app.services.translation_workflows_service import workflow_record
    request_data = None
    if service['request_id']:
        row = connection.execute('SELECT data FROM requests WHERE id = ?', (service['request_id'],)).fetchone()
        if row:
            request_data = json_data(row['data'])
    latest = connection.execute('SELECT * FROM deliveries WHERE service_id = ? ORDER BY version DESC LIMIT 1', (service['id'],)).fetchone()
    assigned = connection.execute('SELECT id, name, email FROM users WHERE id = ?', (service['translator_id'],)).fetchone()
    record = {
        'workflow': workflow_record(connection, service['id']),
        'compensation': str(service['translator_compensation']) if service.get('translator_compensation') is not None else None,
        'id': service['id'], 'requestId': service['request_id'], 'title': service['title'],
        'status': service['status'], 'deadline': service['deadline'], 'createdAt': service['created_at'],
        'updatedAt': service['updated_at'] or service['created_at'], 'startedAt': service['started_at'],
        'readyAt': service['ready_at'], 'deliveredAt': service['delivered_at'],
        'observations': service['observations'] or '', 'source': service['source'] or '',
        'target': service['target'] or '', 'lastVersion': latest['version'] if latest else 0,
        'translator': {'id': assigned['id'], 'name': assigned['name'], 'email': assigned['email']} if assigned else None,
        'history': event_history(connection, service_id=service['id']),
    }
    if latest:
        latest_files = delivery_documents(connection, latest)
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
            'clientName': request_data['name'], 'clientEmail': request_data['email'],
            'company': request_data.get('company', ''),
            'source': service['source'] or request_data['source'], 'target': service['target'] or request_data['target'],
            'attachments': [{**file, 'content': ''} for file in request_data.get('attachments', [])],
        })
    else:
        record['attachments'] = []
    return record


def _request_for_quote(connection, quote_id):
    """Localiza e bloqueia a solicitação ligada ao orçamento respondido pelo cliente."""
    row = connection.execute(
        "SELECT data FROM requests WHERE data -> 'quote' ->> 'id' = ? FOR UPDATE",
        (quote_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, 'Orçamento não encontrado.')
    return json_data(row['data'])


def original_attachment(connection, service, attachment_index):
    """Recupera um anexo original pelo índice dentro da solicitação."""
    if not service['request_id']:
        raise HTTPException(404, 'Documento original não encontrado.')
    data, _ = read_request(connection, service['request_id'])
    attachments = data.get('attachments', [])
    if attachment_index < 0 or attachment_index >= len(attachments):
        raise HTTPException(404, 'Documento original não encontrado.')
    return attachments[attachment_index]
