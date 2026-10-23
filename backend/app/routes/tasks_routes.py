"""Routes for translation tasks, document deliveries and reviews."""

import base64
import secrets
from urllib.parse import quote as urlquote

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, insert, select, update

from app.core.email_service import delivery_attachments, deliver_translation
from app.core.portal_auth import staff, translator, workspace_user
from app.core.workflow import (
    add_event,
    delivery_query,
    delivery_record,
    ensure_task_access,
    original_attachment,
    read_delivery,
    read_request,
    read_service,
    request_exists,
    task_record,
    update_request_status,
)
from app.database_pg import MAX_DELIVERY_BYTES, database, json_data, now, to_datetime
from app.db_models import Delivery, Service
from app.models.translation import DeliveryReview, validate_delivery_document

router = APIRouter()


@router.get('/tasks')
def list_tasks(user: dict = Depends(workspace_user)):
    stmt = select(Service.__table__).order_by(Service.created_at.desc())
    if user['role'] == 'translator':
        stmt = stmt.where(Service.translator_id == user['id'])
    elif user['role'] not in ('admin', 'employee'):
        raise HTTPException(403, 'Sua conta não tem permissão para acessar tarefas de tradução.')
    with database() as session:
        return [task_record(session, item) for item in session.execute(stmt).mappings().all()]


@router.get('/services', include_in_schema=False)
def list_assigned_services(user: dict = Depends(translator)):
    with database() as session:
        services = session.execute(
            select(Service.__table__).where(Service.translator_id == user['id']).order_by(Service.created_at.desc())
        ).mappings().all()
        return [task_record(session, service) for service in services]


@router.get('/tasks/{task_id}')
def task_detail(task_id: str, user: dict = Depends(workspace_user)):
    with database() as session:
        service = read_service(session, task_id)
        ensure_task_access(service, user)
        return task_record(session, service)


@router.post('/tasks/{task_id}/start')
def start_task(task_id: str, user: dict = Depends(translator)):
    with database() as session:
        service = read_service(session, task_id, for_update=True)
        ensure_task_access(service, user)
        if service['status'] != 'Tradutor atribuído':
            raise HTTPException(409, 'Esta tarefa não pode ser iniciada neste status.')
        started_at = now()
        session.execute(
            update(Service).where(Service.id == task_id)
            .values(status='Em andamento', started_at=to_datetime(started_at), updated_at=to_datetime(started_at))
        )
        if service['request_id']:
            update_request_status(session, service['request_id'], 'Em andamento', user, service_id=task_id, timestamp_field='startedAt')
        else:
            add_event(session, 'Em andamento', service_id=task_id, actor=user, created_at=started_at)
        return task_record(session, read_service(session, task_id))


@router.get('/tasks/{task_id}/attachments/{attachment_index}')
def download_original(task_id: str, attachment_index: int, user: dict = Depends(workspace_user)):
    with database() as session:
        service = read_service(session, task_id)
        ensure_task_access(service, user)
        attachment = original_attachment(session, service, attachment_index)
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

    with database() as session:
        service = read_service(session, task_id, for_update=True)
        ensure_task_access(service, user)
        if service['status'] not in ('Em andamento', 'Revisão solicitada', 'Em tradução', 'Ajuste solicitado'):
            raise HTTPException(409, 'Esta tarefa não está disponível para uma nova entrega.')
        version = session.execute(
            select(func.coalesce(func.max(Delivery.version), 0) + 1).where(Delivery.service_id == task_id)
        ).scalar_one()
        delivery_id, submitted_at = 'ENT-' + secrets.token_hex(6).upper(), now()

        primary = saved_files[0]
        names_note = ', '.join(f['name'] for f in saved_files)
        session.execute(
            insert(Delivery).values(
                id=delivery_id, service_id=task_id, version=version, translator_id=user['id'],
                name=primary['name'], media_type=primary['media_type'], size=primary['size'],
                content=primary['content'], status='Aguardando avaliação',
                submitted_at=to_datetime(submitted_at), files=files_json,
            )
        )
        session.execute(
            update(Service).where(Service.id == task_id)
            .values(status='Aguardando avaliação', updated_at=to_datetime(submitted_at))
        )
        if service['request_id'] and request_exists(session, service['request_id']):
            update_request_status(session, service['request_id'], 'Aguardando avaliação', user, f'Versão {version}: {names_note}', task_id, 'submittedAt')
        else:
            add_event(session, 'Aguardando avaliação', service_id=task_id, actor=user, note=f'Versão {version}: {names_note}', created_at=submitted_at)

        return delivery_record(read_delivery(session, delivery_id))


@router.post('/tasks/{task_id}/deliveries', status_code=201)
async def upload_task_delivery(task_id: str, file: UploadFile | None = File(None), files: list[UploadFile] | None = File(None), user: dict = Depends(translator)):
    return await _upload_delivery(task_id, user, file=file, files=files)


@router.post('/services/{task_id}/deliveries', status_code=201, include_in_schema=False)
async def upload_service_delivery(task_id: str, file: UploadFile | None = File(None), files: list[UploadFile] | None = File(None), user: dict = Depends(translator)):
    return await _upload_delivery(task_id, user, file=file, files=files)


@router.get('/deliveries')
def list_deliveries(user: dict = Depends(staff)):
    with database() as session:
        deliveries = session.execute(
            delivery_query().order_by(Delivery.submitted_at.desc(), Delivery.version.desc())
        ).mappings().all()
    return [delivery_record(delivery) for delivery in deliveries]


@router.get('/deliveries/{delivery_id}')
def delivery_detail(delivery_id: str, user: dict = Depends(staff)):
    with database() as session:
        return delivery_record(read_delivery(session, delivery_id))


@router.get('/deliveries/{delivery_id}/file')
def download_delivery(delivery_id: str, user: dict = Depends(staff)):
    with database() as session:
        delivery = read_delivery(session, delivery_id)
        content = bytes(delivery['content'])
        filename = urlquote(delivery['name'], safe='')
        media_type = delivery['media_type']
    return Response(
        content=content, media_type=media_type,
        headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'},
    )


@router.get('/deliveries/{delivery_id}/files/{file_index}')
def download_delivery_file(delivery_id: str, file_index: int, user: dict = Depends(staff)):
    with database() as session:
        delivery = read_delivery(session, delivery_id)
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
def review_delivery(delivery_id: str, review: DeliveryReview, background_tasks: BackgroundTasks, user: dict = Depends(staff)):
    with database() as session:
        delivery = read_delivery(session, delivery_id, for_update=True)
        if delivery['status'] != 'Aguardando avaliação':
            raise HTTPException(409, 'Esta entrega já foi avaliada.')
        latest = session.execute(
            select(Delivery.id).where(Delivery.service_id == delivery['service_id']).order_by(Delivery.version.desc()).limit(1)
        ).mappings().first()
        if not latest or latest['id'] != delivery_id:
            raise HTTPException(409, 'Somente a versão mais recente pode ser avaliada.')

        status = 'Entregue' if review.decision == 'approve' else 'Revisão solicitada'
        reviewed_at = now()
        delivered_at = reviewed_at if status == 'Entregue' else None
        session.execute(
            update(Delivery).where(Delivery.id == delivery_id)
            .values(status=status, feedback=review.feedback or None, reviewed_at=to_datetime(reviewed_at), reviewed_by=user['id'])
        )
        session.execute(
            update(Service).where(Service.id == delivery['service_id'])
            .values(status=status, updated_at=to_datetime(reviewed_at), ready_at=to_datetime(delivered_at), delivered_at=to_datetime(delivered_at))
        )
        service = read_service(session, delivery['service_id'])
        has_request = bool(service['request_id']) and request_exists(session, service['request_id'])
        if has_request:
            update_request_status(
                session, service['request_id'], status, user, review.feedback, service['id'],
                'deliveredAt' if status == 'Entregue' else 'revisionRequestedAt',
            )
        else:
            add_event(session, status, service_id=service['id'], actor=user, note=review.feedback, created_at=reviewed_at)
        client_request = None
        if status == 'Entregue' and has_request:
            client_request, _ = read_request(session, service['request_id'])
        result = delivery_record(read_delivery(session, delivery_id))
    if client_request:
        deliver_translation(client_request, delivery_attachments(delivery), background_tasks)
    return result