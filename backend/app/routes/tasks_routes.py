"""Routes for translation tasks, document deliveries, reviews and final dispatch."""

import base64
import sys
import secrets
from urllib.parse import quote as urlquote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.core.email_service import deliver_final
from app.core.portal_auth import authenticated_user, staff, translator
from app.core.workflow import (
    add_event,
    delivery_record,
    ensure_task_access,
    original_attachment,
    read_delivery,
    read_request,
    read_service,
    task_record,
    update_request_status,
)
from app.database_pg import MAX_DELIVERY_BYTES, database, now
from app.models.translation import DeliveryReview, validate_delivery_document

router = APIRouter()


@router.get('/tasks')
def list_tasks(user: dict = Depends(authenticated_user)):
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
def task_detail(task_id: str, user: dict = Depends(authenticated_user)):
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
def download_original(task_id: str, attachment_index: int, user: dict = Depends(authenticated_user)):
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


async def _upload_delivery(task_id: str, file: UploadFile, user: dict):
    name = (file.filename or '').strip()
    content = await file.read(MAX_DELIVERY_BYTES + 1)
    await file.close()
    media_type = validate_delivery_document(name, content)
    with database() as connection:
        service = read_service(connection, task_id, for_update=True)
        ensure_task_access(service, user)
        if service['status'] not in ('Em andamento', 'Revisão solicitada', 'Em tradução', 'Ajuste solicitado'):
            raise HTTPException(409, 'Esta tarefa não está disponível para uma nova entrega.')
        version = connection.execute('SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM deliveries WHERE service_id = ?', (task_id,)).fetchone()['next_version']
        delivery_id, submitted_at = 'ENT-' + secrets.token_hex(6).upper(), now()
        connection.execute(
            '''INSERT INTO deliveries
               (id, service_id, version, translator_id, name, media_type, size, content, status, submitted_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aguardando avaliação', ?)''',
            (delivery_id, task_id, version, user['id'], name, media_type, len(content), content, submitted_at),
        )
        connection.execute("UPDATE services SET status = 'Aguardando avaliação', updated_at = ? WHERE id = ?", (submitted_at, task_id))
        if service['request_id'] and connection.execute('SELECT 1 FROM requests WHERE id = ?', (service['request_id'],)).fetchone():
            update_request_status(connection, service['request_id'], 'Aguardando avaliação', user, f'Versão {version}: {name}', task_id, 'submittedAt')
        else:
            add_event(connection, 'Aguardando avaliação', service_id=task_id, actor=user, note=f'Versão {version}: {name}', created_at=submitted_at)
        return delivery_record(read_delivery(connection, delivery_id))


@router.post('/tasks/{task_id}/deliveries', status_code=201)
async def upload_task_delivery(task_id: str, file: UploadFile = File(...), user: dict = Depends(translator)):
    return await _upload_delivery(task_id, file, user)


@router.post('/services/{task_id}/deliveries', status_code=201, include_in_schema=False)
async def upload_service_delivery(task_id: str, file: UploadFile = File(...), user: dict = Depends(translator)):
    return await _upload_delivery(task_id, file, user)


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


@router.post('/deliveries/{delivery_id}/review')
def review_delivery(delivery_id: str, review: DeliveryReview, user: dict = Depends(staff)):
    with database() as connection:
        delivery = read_delivery(connection, delivery_id, for_update=True)
        if delivery['status'] != 'Aguardando avaliação':
            raise HTTPException(409, 'Esta entrega já foi avaliada.')
        latest = connection.execute('SELECT id FROM deliveries WHERE service_id = ? ORDER BY version DESC LIMIT 1', (delivery['service_id'],)).fetchone()
        if not latest or latest['id'] != delivery_id:
            raise HTTPException(409, 'Somente a versão mais recente pode ser avaliada.')
        status = 'Pronta' if review.decision == 'approve' else 'Revisão solicitada'
        reviewed_at = now()
        connection.execute(
            'UPDATE deliveries SET status = ?, feedback = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?',
            (status, review.feedback or None, reviewed_at, user['id'], delivery_id),
        )
        connection.execute(
            'UPDATE services SET status = ?, updated_at = ?, ready_at = ? WHERE id = ?',
            (status, reviewed_at, reviewed_at if status == 'Pronta' else None, delivery['service_id']),
        )
        service = read_service(connection, delivery['service_id'])
        if service['request_id'] and connection.execute('SELECT 1 FROM requests WHERE id = ?', (service['request_id'],)).fetchone():
            update_request_status(
                connection, service['request_id'], status, user, review.feedback, service['id'],
                'readyAt' if status == 'Pronta' else 'revisionRequestedAt',
            )
        else:
            add_event(connection, status, service_id=service['id'], actor=user, note=review.feedback, created_at=reviewed_at)
        return delivery_record(read_delivery(connection, delivery_id))


@router.post('/tasks/{task_id}/send-final')
def send_final(task_id: str, user: dict = Depends(staff)):
    with database() as connection:
        service = read_service(connection, task_id, for_update=True)
        if service['sending'] or service['status'] == 'Entregue':
            raise HTTPException(409, 'Esta entrega já foi enviada ou está em envio.')
        if service['status'] != 'Pronta' or not service['request_id']:
            raise HTTPException(409, 'A tradução precisa estar aprovada antes do envio ao cliente.')
        data, _ = read_request(connection, service['request_id'])
        delivery = connection.execute("SELECT * FROM deliveries WHERE service_id = ? AND status = 'Pronta' ORDER BY version DESC LIMIT 1", (task_id,)).fetchone()
        if not delivery:
            raise HTTPException(409, 'Documento final aprovado não encontrado.')
        connection.execute('UPDATE services SET sending = TRUE WHERE id = ?', (task_id,))
    try:
        final_sender = getattr(sys.modules.get('requests_api'), 'deliver_final', deliver_final)
        final_sender(data, service, delivery)
    except Exception as error:
        with database() as connection:
            connection.execute('UPDATE services SET sending = FALSE WHERE id = ?', (task_id,))
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(502, 'Não foi possível confirmar o envio do documento final. Confira a caixa de saída antes de tentar novamente.') from error
    delivered_at = now()
    with database() as connection:
        connection.execute(
            "UPDATE services SET status = 'Entregue', delivered_at = ?, updated_at = ?, sending = FALSE WHERE id = ?",
            (delivered_at, delivered_at, task_id),
        )
        update_request_status(connection, service['request_id'], 'Entregue', user, f"Arquivo final: {delivery['name']}", task_id, 'deliveredAt')
        return task_record(connection, read_service(connection, task_id))