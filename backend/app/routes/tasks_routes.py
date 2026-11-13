"""Assigned translation tasks, file versions, downloads and reviews."""

import base64
import secrets
from urllib.parse import quote as urlquote

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, insert, select, update

from app.core.portal_auth import ensure_task_access, staff, translator, workspace_user
from app.database_pg import (
    MAX_DELIVERY_BYTES,
    MAX_DELIVERY_FILES,
    MAX_DELIVERY_TOTAL_BYTES,
    database,
    now,
    to_datetime,
)
from app.db_models import Delivery, DeliveryFile, Service, TranslationRequest
from app.models.translation import DeliveryReview, validate_delivery_document
from app.repositories.translation_store import (
    add_event,
    delivery_documents,
    delivery_query,
    delivery_record,
    original_attachment,
    read_delivery,
    read_request,
    read_service,
    task_record,
    update_request_status,
)
from app.services.email.workflow_service import deliver_translation

router = APIRouter()


@router.get('/tasks')
def list_tasks(user: dict = Depends(workspace_user)):
    """Lista todas as tarefas para a equipe ou apenas as atribuídas ao tradutor."""
    if user['role'] == 'translator':
        query = select(Service.__table__).where(Service.translator_id == user['id'])
    elif user['role'] in ('admin', 'employee'):
        query = select(Service.__table__)
    else:
        raise HTTPException(403, 'Sua conta não tem permissão para acessar tarefas de tradução.')
    with database() as session:
        return [
            task_record(session, item)
            for item in session.execute(query.order_by(Service.created_at.desc())).mappings().all()
        ]


@router.get('/services', include_in_schema=False)
def list_assigned_services(user: dict = Depends(translator)):
    """Mantém a rota antiga de serviços apontando para as tarefas do tradutor."""
    with database() as session:
        services = (
            session.execute(
                select(Service.__table__).where(Service.translator_id == user['id']).order_by(Service.created_at.desc())
            )
            .mappings()
            .all()
        )
        return [task_record(session, service) for service in services]


@router.get('/tasks/{task_id}')
def task_detail(task_id: str, user: dict = Depends(workspace_user)):
    """Retorna a tarefa depois de conferir se a conta pode acessá-la."""
    with database() as session:
        service = read_service(session, task_id)
        ensure_task_access(service, user)
        return task_record(session, service)


@router.post('/tasks/{task_id}/start')
def start_task(task_id: str, user: dict = Depends(translator)):
    """Marca o início do trabalho pelo tradutor responsável e atualiza o histórico."""
    with database() as session:
        service = read_service(session, task_id, for_update=True)
        ensure_task_access(service, user)
        if service['status'] != 'Tradutor atribuído':
            raise HTTPException(409, 'Esta tarefa não pode ser iniciada neste status.')
        started_at = now()
        session.execute(
            update(Service)
            .values(status='Em andamento', started_at=to_datetime(started_at), updated_at=to_datetime(started_at))
            .where(Service.id == task_id)
        )
        if service['request_id']:
            update_request_status(
                session, service['request_id'], 'Em andamento', user, service_id=task_id, timestamp_field='startedAt'
            )
        else:
            add_event(session, 'Em andamento', service_id=task_id, actor=user, created_at=started_at)
        return task_record(session, read_service(session, task_id))


@router.get('/tasks/{task_id}/attachments/{attachment_index}')
def download_original(task_id: str, attachment_index: int, user: dict = Depends(workspace_user)):
    """Entrega o documento original apenas a quem tem acesso à tarefa."""
    with database() as session:
        service = read_service(session, task_id)
        ensure_task_access(service, user)
        attachment = original_attachment(session, service, attachment_index)
    content = base64.b64decode(attachment['content'], validate=True)
    filename = urlquote(attachment['name'], safe='')
    return Response(
        content=content,
        media_type='application/octet-stream',
        headers={
            'Content-Disposition': f"attachment; filename*=UTF-8''{filename}",
            'X-Content-Type-Options': 'nosniff',
        },
    )


async def _upload_delivery(task_id: str, uploads: list[UploadFile], user: dict):
    """Valida e salva uma versão com um ou mais arquivos, pronta para avaliação conjunta."""
    if not uploads:
        raise HTTPException(422, 'Selecione ao menos um documento traduzido.')
    if len(uploads) > MAX_DELIVERY_FILES:
        raise HTTPException(422, f'Envie no máximo {MAX_DELIVERY_FILES} documentos por versão.')
    prepared = []
    total_size = 0
    for upload in uploads:
        name = (upload.filename or '').strip()
        content = await upload.read(MAX_DELIVERY_BYTES + 1)
        await upload.close()
        media_type = validate_delivery_document(name, content)
        total_size += len(content)
        prepared.append({'name': name, 'content': content, 'media_type': media_type})
    if total_size > MAX_DELIVERY_TOTAL_BYTES:
        raise HTTPException(422, 'Os documentos devem ter no máximo 20 MB no total.')
    with database() as session:
        service = read_service(session, task_id, for_update=True)
        ensure_task_access(service, user)
        from app.services.translation_workflows_service import (
            synchronize_delivery,
            workflow_record,
        )

        process = workflow_record(session, task_id)
        translator_turn = process and any(
            stage['status'] == 'current' and definition['role'] == 'translator'
            for stage, definition in zip(process['stages'], process['definition']['stages'])
        )
        if service['status'] not in ('Em andamento', 'Revisão solicitada', 'Em tradução', 'Ajuste solicitado') and not (
            service['status'] == 'Aguardando avaliação' and translator_turn
        ):
            raise HTTPException(409, 'Esta tarefa não está disponível para uma nova entrega.')
        version = session.execute(
            select(func.coalesce(func.max(Delivery.version), 0) + 1).where(Delivery.service_id == task_id)
        ).scalar_one()
        delivery_id, submitted_at = 'ENT-' + secrets.token_hex(6).upper(), now()
        synchronize_delivery(session, service, user, 'submit', f'Versão {version} enviada para avaliação.')
        first = prepared[0]
        session.execute(
            insert(Delivery).values(
                id=delivery_id,
                service_id=task_id,
                version=version,
                translator_id=user['id'],
                name=first['name'],
                media_type=first['media_type'],
                size=len(first['content']),
                content=first['content'],
                status='Aguardando avaliação',
                submitted_at=to_datetime(submitted_at),
            )
        )
        for position, document in enumerate(prepared):
            session.execute(
                insert(DeliveryFile).values(
                    delivery_id=delivery_id,
                    position=position,
                    name=document['name'],
                    media_type=document['media_type'],
                    size=len(document['content']),
                    content=document['content'],
                )
            )
        session.execute(
            update(Service)
            .values(status='Aguardando avaliação', updated_at=to_datetime(submitted_at))
            .where(Service.id == task_id)
        )
        file_note = f'Versão {version}: ' + (first['name'] if len(prepared) == 1 else f'{len(prepared)} arquivos')
        if (
            service['request_id']
            and session.execute(
                select(1).select_from(TranslationRequest).where(TranslationRequest.id == service['request_id'])
            )
            .mappings()
            .first()
        ):
            update_request_status(
                session, service['request_id'], 'Aguardando avaliação', user, file_note, task_id, 'submittedAt'
            )
        else:
            add_event(
                session, 'Aguardando avaliação', service_id=task_id, actor=user, note=file_note, created_at=submitted_at
            )
        return delivery_record(session, read_delivery(session, delivery_id))


@router.post('/tasks/{task_id}/deliveries', status_code=201)
async def upload_task_delivery(
    task_id: str,
    files: list[UploadFile] | None = File(None),
    file: UploadFile | None = File(None),
    user: dict = Depends(translator),
):
    """Recebe uma versão traduzida pela rota atual de tarefas."""
    return await _upload_delivery(task_id, files or ([file] if file else []), user)


@router.post('/services/{task_id}/deliveries', status_code=201, include_in_schema=False)
async def upload_service_delivery(
    task_id: str,
    files: list[UploadFile] | None = File(None),
    file: UploadFile | None = File(None),
    user: dict = Depends(translator),
):
    """Mantém compatibilidade com a rota antiga de envio por serviços."""
    return await _upload_delivery(task_id, files or ([file] if file else []), user)


@router.get('/deliveries')
def list_deliveries(user: dict = Depends(staff)):
    """Lista para a equipe todas as versões recebidas, da mais recente para a mais antiga."""
    with database() as session:
        deliveries = (
            session.execute(delivery_query().order_by(Delivery.submitted_at.desc(), Delivery.version.desc()))
            .mappings()
            .all()
        )
        return [delivery_record(session, delivery) for delivery in deliveries]


@router.get('/deliveries/{delivery_id}')
def delivery_detail(delivery_id: str, user: dict = Depends(staff)):
    """Retorna os metadados de uma entrega sem carregar seu arquivo na resposta."""
    with database() as session:
        return delivery_record(session, read_delivery(session, delivery_id))


@router.get('/deliveries/{delivery_id}/file')
def download_delivery(delivery_id: str, user: dict = Depends(staff)):
    """Baixa o arquivo de uma entrega com cabeçalhos que evitam execução no navegador."""
    with database() as session:
        delivery = read_delivery(session, delivery_id)
        content = bytes(delivery['content'])
        filename = urlquote(delivery['name'], safe='')
        media_type = delivery['media_type']
    return Response(
        content=content,
        media_type=media_type,
        headers={
            'Content-Disposition': f"attachment; filename*=UTF-8''{filename}",
            'X-Content-Type-Options': 'nosniff',
        },
    )


@router.get('/deliveries/{delivery_id}/files/{file_index}')
def download_delivery_file(delivery_id: str, file_index: int, user: dict = Depends(staff)):
    """Baixa um arquivo específico quando a versão contém vários documentos."""
    with database() as session:
        delivery = read_delivery(session, delivery_id)
        files = delivery_documents(session, delivery)
        if file_index < 0 or file_index >= len(files):
            raise HTTPException(404, 'Arquivo da entrega não encontrado.')
        document = files[file_index]
        content = bytes(document['content'])
        filename = urlquote(document['name'], safe='')
        media_type = document['media_type']
    return Response(
        content=content,
        media_type=media_type,
        headers={
            'Content-Disposition': f"attachment; filename*=UTF-8''{filename}",
            'X-Content-Type-Options': 'nosniff',
        },
    )


@router.post('/deliveries/{delivery_id}/review')
def review_delivery(
    delivery_id: str, review: DeliveryReview, background_tasks: BackgroundTasks, user: dict = Depends(staff)
):
    with database() as session:
        delivery = read_delivery(session, delivery_id)
        service = read_service(session, delivery['service_id'], for_update=True)
        delivery = read_delivery(session, delivery_id, for_update=True)
        if delivery['status'] != 'Aguardando avaliação':
            raise HTTPException(409, 'Esta entrega já foi avaliada.')
        latest = (
            session.execute(
                select(Delivery.id)
                .where(Delivery.service_id == delivery['service_id'])
                .order_by(Delivery.version.desc())
                .limit(1)
            )
            .mappings()
            .first()
        )
        if not latest or latest['id'] != delivery_id:
            raise HTTPException(409, 'Somente a versão mais recente pode ser avaliada.')
        from app.services.translation_workflows_service import synchronize_delivery

        process = synchronize_delivery(
            session,
            service,
            user,
            review.decision,
            review.feedback
            or f'Versão {delivery["version"]} aprovada; revisão e critérios de qualidade confirmados pela equipe.',
        )
        continuing = review.decision == 'approve' and process and process['progress'] < 100
        status = 'Em andamento' if continuing else 'Entregue' if review.decision == 'approve' else 'Revisão solicitada'
        delivery_status = 'Pronta' if continuing else status
        reviewed_at = now()
        session.execute(
            update(Delivery)
            .values(
                status=delivery_status,
                feedback=review.feedback or None,
                reviewed_at=to_datetime(reviewed_at),
                reviewed_by=user['id'],
            )
            .where(Delivery.id == delivery_id)
        )
        session.execute(
            update(Service)
            .values(
                status=status,
                updated_at=to_datetime(reviewed_at),
                ready_at=to_datetime(reviewed_at if status == 'Entregue' else None),
                delivered_at=to_datetime(reviewed_at if status == 'Entregue' else None),
            )
            .where(Service.id == delivery['service_id'])
        )
        service = read_service(session, delivery['service_id'])
        if (
            service['request_id']
            and session.execute(
                select(1).select_from(TranslationRequest).where(TranslationRequest.id == service['request_id'])
            )
            .mappings()
            .first()
        ):
            note = review.feedback or (
                'Conferência aprovada. Próxima etapa liberada para o tradutor.'
                if continuing
                else 'Tradução aprovada e serviço finalizado.'
                if status == 'Entregue'
                else ''
            )
            update_request_status(
                session,
                service['request_id'],
                status,
                user,
                note,
                service['id'],
                'workflowAdvancedAt'
                if continuing
                else 'deliveredAt'
                if status == 'Entregue'
                else 'revisionRequestedAt',
            )
        else:
            add_event(
                session, status, service_id=service['id'], actor=user, note=review.feedback, created_at=reviewed_at
            )
        client_request = None
        if (
            status == 'Entregue'
            and service['request_id']
            and session.execute(
                select(1).select_from(TranslationRequest).where(TranslationRequest.id == service['request_id'])
            )
            .mappings()
            .first()
        ):
            client_request, _ = read_request(session, service['request_id'])
        attachments = (
            [
                {'name': file['name'], 'content': bytes(file['content']), 'media_type': file['media_type']}
                for file in delivery_documents(session, delivery)
            ]
            if client_request
            else []
        )
        result = delivery_record(session, read_delivery(session, delivery_id))
    if client_request:
        deliver_translation(
            {
                **client_request,
                'target': service['target'] or client_request['target'],
                'orderComplete': client_request['status'] == 'Entregue',
            },
            attachments,
            background_tasks,
        )
    return result
