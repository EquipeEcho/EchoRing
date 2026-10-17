"""Routes for translation tasks, document deliveries and reviews."""

import base64
import secrets
from urllib.parse import quote as urlquote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from psycopg.types.json import Jsonb

from app.core.portal_auth import staff, translator, workspace_user
from app.core.workflow import (
    add_event,
    delivery_record,
    ensure_task_access,
    original_attachment,
    read_delivery,
    read_service,
    task_record,
    update_request_status,
)
from app.database_pg import MAX_DELIVERY_BYTES, database, json_data, now
from app.models.translation import DeliveryReview, validate_delivery_document

router = APIRouter()


@router.get('/tasks')
def list_tasks(user: dict = Depends(workspace_user)):
    if user['role'] == 'translator':
        query, values = 'SELECT * FROM services WHERE translator_id = ? ORDER BY created_at DESC', (user['id'],)
    elif user['role'] in ('admin', 'employee'):
        query, values = 'SELECT * FROM services ORDER BY created_at DESC', ()
    else:
        raise HTTPException(403, 'Sua conta não tem permissão para acessar tarefas de tradução.')
    with database() as connection:
        return [task_record(connection, item) for item in connection.execute(query, values).fetchall()]


@router.get('/services', include_in_schema=False)
def list_assigned_services(user: dict = Depends(translator)):
    with database() as connection:
        services = connection.execute('SELECT * FROM services WHERE translator_id = ? ORDER BY created_at DESC', (user['id'],)).fetchall()
        return [task_record(connection, service) for service in services]


@router.get('/tasks/{task_id}')
def task_detail(task_id: str, user: dict = Depends(workspace_user)):
    with database() as connection:
        service = read_service(connection, task_id)
        ensure_task_access(service, user)
        return task_record(connection, service)


@router.post('/tasks/{task_id}/start')
def start_task(task_id: str, user: dict = Depends(translator)):
    with database() as connection:
        service = read_service(connection, task_id, for_update=True)
        ensure_task_access(service, user)
        if service['status'] != 'Tradutor atribuído':
            raise HTTPException(409, 'Esta tarefa não pode ser iniciada neste status.')
        started_at = now()
        connection.execute("UPDATE services SET status = 'Em andamento', started_at = ?, updated_at = ? WHERE id = ?", (started_at, started_at, task_id))
        if service['request_id']:
            update_request_status(connection, service['request_id'], 'Em andamento', user, service_id=task_id, timestamp_field='startedAt')
        else:
            add_event(connection, 'Em andamento', service_id=task_id, actor=user, created_at=started_at)
        return task_record(connection, read_service(connection, task_id))


@router.get('/tasks/{task_id}/attachments/{attachment_index}')
def download_original(task_id: str, attachment_index: int, user: dict = Depends(workspace_user)):
    with database() as connection:
        service = read_service(connection, task_id)
        ensure_task_access(service, user)
        attachment = original_attachment(connection, service, attachment_index)
    content = base64.b64decode(attachment['content'], validate=True)
    filename = urlquote(attachment['name'], safe='')
    return Response(
        content=content, media_type='application/octet-stream',
        headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'},
    )


async def _upload_delivery(task_id: str, user: dict, file: UploadFile | None = None, files: list[UploadFile] | None = None):
    uploaded_files = []
    if file is not None:
        uploaded_files.append(file)
    if files:
        uploaded_files.extend(files)

    if not uploaded_files:
        raise HTTPException(422, 'Nenhum documento enviado.')

    saved_files = []
    total_size = 0
    for item in uploaded_files:
        name = (item.filename or '').strip()
        content = await item.read(MAX_DELIVERY_BYTES + 1)
        await item.close()
        media_type = validate_delivery_document(name, content)
        total_size += len(content)
        saved_files.append({
            'name': name,
            'media_type': media_type,
            'size': len(content),
            'content': content,
            'content_b64': base64.b64encode(content).decode('ascii'),
        })

    if total_size > MAX_DELIVERY_BYTES:
        raise HTTPException(422, 'O tamanho total dos documentos excede o limite de 5 MB.')

    files_json = [
        {
            'name': f['name'],
            'media_type': f['media_type'],
            'size': f['size'],
            'content': f['content_b64'],
        }
        for f in saved_files
    ]

    with database() as connection:
        service = read_service(connection, task_id, for_update=True)
        ensure_task_access(service, user)
        if service['status'] not in ('Em andamento', 'Revisão solicitada', 'Em tradução', 'Ajuste solicitado'):
            raise HTTPException(409, 'Esta tarefa não está disponível para uma nova entrega.')
        version = connection.execute('SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM deliveries WHERE service_id = ?', (task_id,)).fetchone()['next_version']
        delivery_id, submitted_at = 'ENT-' + secrets.token_hex(6).upper(), now()

        primary = saved_files[0]
        names_note = ', '.join(f['name'] for f in saved_files)
        connection.execute(
            '''INSERT INTO deliveries
               (id, service_id, version, translator_id, name, media_type, size, content, status, submitted_at, files)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aguardando avaliação', ?, ?)''',
            (delivery_id, task_id, version, user['id'], primary['name'], primary['media_type'], primary['size'], primary['content'], submitted_at, Jsonb(files_json)),
        )
        connection.execute("UPDATE services SET status = 'Aguardando avaliação', updated_at = ? WHERE id = ?", (submitted_at, task_id))
        if service['request_id'] and connection.execute('SELECT 1 FROM requests WHERE id = ?', (service['request_id'],)).fetchone():
            update_request_status(connection, service['request_id'], 'Aguardando avaliação', user, f'Versão {version}: {names_note}', task_id, 'submittedAt')
        else:
            add_event(connection, 'Aguardando avaliação', service_id=task_id, actor=user, note=f'Versão {version}: {names_note}', created_at=submitted_at)

        return delivery_record(read_delivery(connection, delivery_id))


@router.post('/tasks/{task_id}/deliveries', status_code=201)
async def upload_task_delivery(task_id: str, file: UploadFile | None = File(None), files: list[UploadFile] | None = File(None), user: dict = Depends(translator)):
    return await _upload_delivery(task_id, user, file=file, files=files)


@router.post('/services/{task_id}/deliveries', status_code=201, include_in_schema=False)
async def upload_service_delivery(task_id: str, file: UploadFile | None = File(None), files: list[UploadFile] | None = File(None), user: dict = Depends(translator)):
    return await _upload_delivery(task_id, user, file=file, files=files)


@router.get('/deliveries')
def list_deliveries(user: dict = Depends(staff)):
    with database() as connection:
        deliveries = connection.execute(
            '''SELECT deliveries.*, services.title AS service_title,
                      translator_user.name AS translator_name, reviewer.name AS reviewer_name
               FROM deliveries JOIN services ON services.id = deliveries.service_id
               LEFT JOIN users AS translator_user ON translator_user.id = deliveries.translator_id
               LEFT JOIN users AS reviewer ON reviewer.id = deliveries.reviewed_by
               ORDER BY deliveries.submitted_at DESC, deliveries.version DESC'''
        ).fetchall()
    return [delivery_record(delivery) for delivery in deliveries]


@router.get('/deliveries/{delivery_id}')
def delivery_detail(delivery_id: str, user: dict = Depends(staff)):
    with database() as connection:
        return delivery_record(read_delivery(connection, delivery_id))


@router.get('/deliveries/{delivery_id}/file')
def download_delivery(delivery_id: str, user: dict = Depends(staff)):
    with database() as connection:
        delivery = read_delivery(connection, delivery_id)
        content = bytes(delivery['content'])
        filename = urlquote(delivery['name'], safe='')
        media_type = delivery['media_type']
    return Response(
        content=content, media_type=media_type,
        headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'},
    )


@router.get('/deliveries/{delivery_id}/files/{file_index}')
def download_delivery_file(delivery_id: str, file_index: int, user: dict = Depends(staff)):
    with database() as connection:
        delivery = read_delivery(connection, delivery_id)
        raw_files = delivery.get('files')
        parsed = (json_data(raw_files) if isinstance(raw_files, str) else raw_files) if raw_files else []
        if parsed:
            if file_index < 0 or file_index >= len(parsed):
                raise HTTPException(404, 'Arquivo não encontrado.')
            item = parsed[file_index]
            content = base64.b64decode(item['content'])
            filename = urlquote(item['name'], safe='')
            media_type = item.get('media_type') or item.get('mediaType', 'application/octet-stream')
        else:
            if file_index != 0:
                raise HTTPException(404, 'Arquivo não encontrado.')
            content = bytes(delivery['content'])
            filename = urlquote(delivery['name'], safe='')
            media_type = delivery['media_type']
    return Response(
        content=content, media_type=media_type,
        headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'},
    )


@router.post('/deliveries/{delivery_id}/review')
def review_delivery(delivery_id: str, review: DeliveryReview, user: dict = Depends(staff)):
    with database() as connection:
        delivery = read_delivery(connection, delivery_id, for_update=True)
        if delivery['status'] != 'Aguardando avaliação':
            raise HTTPException(409, 'Esta entrega já foi avaliada.')
        latest = connection.execute('SELECT id FROM deliveries WHERE service_id = ? ORDER BY version DESC LIMIT 1', (delivery['service_id'],)).fetchone()
        if not latest or latest['id'] != delivery_id:
            raise HTTPException(409, 'Somente a versão mais recente pode ser avaliada.')

        status = 'Entregue' if review.decision == 'approve' else 'Revisão solicitada'
        reviewed_at = now()
        delivered_at = reviewed_at if status == 'Entregue' else None
        connection.execute(
            'UPDATE deliveries SET status = ?, feedback = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?',
            (status, review.feedback or None, reviewed_at, user['id'], delivery_id),
        )
        connection.execute(
            'UPDATE services SET status = ?, updated_at = ?, ready_at = ?, delivered_at = ? WHERE id = ?',
            (status, reviewed_at, delivered_at, delivered_at, delivery['service_id']),
        )
        service = read_service(connection, delivery['service_id'])
        if service['request_id'] and connection.execute('SELECT 1 FROM requests WHERE id = ?', (service['request_id'],)).fetchone():
            update_request_status(
                connection, service['request_id'], status, user, review.feedback, service['id'],
                'deliveredAt' if status == 'Entregue' else 'revisionRequestedAt',
            )
        else:
            add_event(connection, status, service_id=service['id'], actor=user, note=review.feedback, created_at=reviewed_at)
        return delivery_record(read_delivery(connection, delivery_id))