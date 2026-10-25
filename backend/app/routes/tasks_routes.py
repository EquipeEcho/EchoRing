"""Assigned translation tasks, file versions, downloads and reviews."""
import base64
import secrets
from urllib.parse import quote as urlquote
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from app.core.portal_auth import ensure_task_access, staff, translator, workspace_user
from app.database_pg import MAX_DELIVERY_BYTES, MAX_DELIVERY_FILES, MAX_DELIVERY_TOTAL_BYTES, database, now
from app.services.email.workflow_service import deliver_translation
from app.models.translation import DeliveryReview, validate_delivery_document
from app.repositories.translation_store import add_event, delivery_documents, delivery_record, original_attachment, read_delivery, read_request, read_service, task_record, update_request_status

router = APIRouter()


@router.get('/tasks')
def list_tasks(user: dict = Depends(workspace_user)):
    """Lista todas as tarefas para a equipe ou apenas as atribuídas ao tradutor."""
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
    """Mantém a rota antiga de serviços apontando para as tarefas do tradutor."""
    with database() as connection:
        services = connection.execute('SELECT * FROM services WHERE translator_id = ? ORDER BY created_at DESC', (user['id'],)).fetchall()
        return [task_record(connection, service) for service in services]


@router.get('/tasks/{task_id}')
def task_detail(task_id: str, user: dict = Depends(workspace_user)):
    """Retorna a tarefa depois de conferir se a conta pode acessá-la."""
    with database() as connection:
        service = read_service(connection, task_id)
        ensure_task_access(service, user)
        return task_record(connection, service)


@router.post('/tasks/{task_id}/start')
def start_task(task_id: str, user: dict = Depends(translator)):
    """Marca o início do trabalho pelo tradutor responsável e atualiza o histórico."""
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
    """Entrega o documento original apenas a quem tem acesso à tarefa."""
    with database() as connection:
        service = read_service(connection, task_id)
        ensure_task_access(service, user)
        attachment = original_attachment(connection, service, attachment_index)
    content = base64.b64decode(attachment['content'], validate=True)
    filename = urlquote(attachment['name'], safe='')
    return Response(content=content, media_type='application/octet-stream',
                    headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'})


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
    with database() as connection:
        service = read_service(connection, task_id, for_update=True)
        ensure_task_access(service, user)
        from app.services.translation_workflows_service import synchronize_delivery, workflow_record
        process = workflow_record(connection, task_id)
        translator_turn = process and any(stage['status'] == 'current' and definition['role'] == 'translator'
            for stage, definition in zip(process['stages'], process['definition']['stages']))
        if service['status'] not in ('Em andamento', 'Revisão solicitada', 'Em tradução', 'Ajuste solicitado') and not (
                service['status'] == 'Aguardando avaliação' and translator_turn):
            raise HTTPException(409, 'Esta tarefa não está disponível para uma nova entrega.')
        version = connection.execute('SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM deliveries WHERE service_id = ?', (task_id,)).fetchone()['next_version']
        delivery_id, submitted_at = 'ENT-' + secrets.token_hex(6).upper(), now()
        synchronize_delivery(connection, service, user, 'submit', f'Versão {version} enviada para avaliação.')
        first = prepared[0]
        connection.execute(
            '''INSERT INTO deliveries
               (id, service_id, version, translator_id, name, media_type, size, content, status, submitted_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aguardando avaliação', ?)''',
            (delivery_id, task_id, version, user['id'], first['name'], first['media_type'], len(first['content']), first['content'], submitted_at),
        )
        for position, document in enumerate(prepared):
            connection.execute(
                '''INSERT INTO delivery_files (delivery_id, position, name, media_type, size, content)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (delivery_id, position, document['name'], document['media_type'], len(document['content']), document['content']),
            )
        connection.execute("UPDATE services SET status = 'Aguardando avaliação', updated_at = ? WHERE id = ?", (submitted_at, task_id))
        file_note = f"Versão {version}: " + (first['name'] if len(prepared) == 1 else f"{len(prepared)} arquivos")
        if service['request_id'] and connection.execute('SELECT 1 FROM requests WHERE id = ?', (service['request_id'],)).fetchone():
            update_request_status(connection, service['request_id'], 'Aguardando avaliação', user, file_note, task_id, 'submittedAt')
        else:
            add_event(connection, 'Aguardando avaliação', service_id=task_id, actor=user, note=file_note, created_at=submitted_at)
        return delivery_record(connection, read_delivery(connection, delivery_id))


@router.post('/tasks/{task_id}/deliveries', status_code=201)
async def upload_task_delivery(task_id: str, files: list[UploadFile] | None = File(None), file: UploadFile | None = File(None), user: dict = Depends(translator)):
    """Recebe uma versão traduzida pela rota atual de tarefas."""
    return await _upload_delivery(task_id, files or ([file] if file else []), user)


@router.post('/services/{task_id}/deliveries', status_code=201, include_in_schema=False)
async def upload_service_delivery(task_id: str, files: list[UploadFile] | None = File(None), file: UploadFile | None = File(None), user: dict = Depends(translator)):
    """Mantém compatibilidade com a rota antiga de envio por serviços."""
    return await _upload_delivery(task_id, files or ([file] if file else []), user)


@router.get('/deliveries')
def list_deliveries(user: dict = Depends(staff)):
    """Lista para a equipe todas as versões recebidas, da mais recente para a mais antiga."""
    with database() as connection:
        deliveries = connection.execute(
            '''SELECT deliveries.*, services.title AS service_title,
                      translator_user.name AS translator_name, reviewer.name AS reviewer_name
               FROM deliveries JOIN services ON services.id = deliveries.service_id
               LEFT JOIN users AS translator_user ON translator_user.id = deliveries.translator_id
               LEFT JOIN users AS reviewer ON reviewer.id = deliveries.reviewed_by
               ORDER BY deliveries.submitted_at DESC, deliveries.version DESC''').fetchall()
        return [delivery_record(connection, delivery) for delivery in deliveries]


@router.get('/deliveries/{delivery_id}')
def delivery_detail(delivery_id: str, user: dict = Depends(staff)):
    """Retorna os metadados de uma entrega sem carregar seu arquivo na resposta."""
    with database() as connection:
        return delivery_record(connection, read_delivery(connection, delivery_id))


@router.get('/deliveries/{delivery_id}/file')
def download_delivery(delivery_id: str, user: dict = Depends(staff)):
    """Baixa o arquivo de uma entrega com cabeçalhos que evitam execução no navegador."""
    with database() as connection:
        delivery = read_delivery(connection, delivery_id)
        content = bytes(delivery['content'])
        filename = urlquote(delivery['name'], safe='')
        media_type = delivery['media_type']
    return Response(content=content, media_type=media_type,
                    headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'})


@router.get('/deliveries/{delivery_id}/files/{file_index}')
def download_delivery_file(delivery_id: str, file_index: int, user: dict = Depends(staff)):
    """Baixa um arquivo específico quando a versão contém vários documentos."""
    with database() as connection:
        delivery = read_delivery(connection, delivery_id)
        files = delivery_documents(connection, delivery)
        if file_index < 0 or file_index >= len(files):
            raise HTTPException(404, 'Arquivo da entrega não encontrado.')
        document = files[file_index]
        content = bytes(document['content'])
        filename = urlquote(document['name'], safe='')
        media_type = document['media_type']
    return Response(content=content, media_type=media_type,
                    headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'})


@router.post('/deliveries/{delivery_id}/review')
def review_delivery(delivery_id: str, review: DeliveryReview, background_tasks: BackgroundTasks, user: dict = Depends(staff)):
    with database() as connection:
        delivery = read_delivery(connection, delivery_id)
        service = read_service(connection, delivery['service_id'], for_update=True)
        delivery = read_delivery(connection, delivery_id, for_update=True)
        if delivery['status'] != 'Aguardando avaliação':
            raise HTTPException(409, 'Esta entrega já foi avaliada.')
        latest = connection.execute('SELECT id FROM deliveries WHERE service_id = ? ORDER BY version DESC LIMIT 1', (delivery['service_id'],)).fetchone()
        if not latest or latest['id'] != delivery_id:
            raise HTTPException(409, 'Somente a versão mais recente pode ser avaliada.')
        from app.services.translation_workflows_service import synchronize_delivery
        process = synchronize_delivery(connection, service, user, review.decision,
            review.feedback or f"Versão {delivery['version']} aprovada; revisão e critérios de qualidade confirmados pela equipe.")
        continuing = review.decision == 'approve' and process and process['progress'] < 100
        status = 'Em andamento' if continuing else 'Entregue' if review.decision == 'approve' else 'Revisão solicitada'
        delivery_status = 'Pronta' if continuing else status
        reviewed_at = now()
        connection.execute('UPDATE deliveries SET status = ?, feedback = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?',
                           (delivery_status, review.feedback or None, reviewed_at, user['id'], delivery_id))
        connection.execute('UPDATE services SET status = ?, updated_at = ?, ready_at = ?, delivered_at = ? WHERE id = ?',
                           (status, reviewed_at, reviewed_at if status == 'Entregue' else None,
                            reviewed_at if status == 'Entregue' else None, delivery['service_id']))
        service = read_service(connection, delivery['service_id'])
        if service['request_id'] and connection.execute('SELECT 1 FROM requests WHERE id = ?', (service['request_id'],)).fetchone():
            note = review.feedback or ('Conferência aprovada. Próxima etapa liberada para o tradutor.' if continuing else 'Tradução aprovada e serviço finalizado.' if status == 'Entregue' else '')
            update_request_status(connection, service['request_id'], status, user, note, service['id'],
                                  'workflowAdvancedAt' if continuing else 'deliveredAt' if status == 'Entregue' else 'revisionRequestedAt')
        else:
            add_event(connection, status, service_id=service['id'], actor=user, note=review.feedback, created_at=reviewed_at)
        client_request = None
        if status == 'Entregue' and service['request_id'] and connection.execute('SELECT 1 FROM requests WHERE id = ?', (service['request_id'],)).fetchone():
            client_request, _ = read_request(connection, service['request_id'])
        attachments = [{'name': file['name'], 'content': bytes(file['content']), 'media_type': file['media_type']}
                       for file in delivery_documents(connection, delivery)] if client_request else []
        result = delivery_record(connection, read_delivery(connection, delivery_id))
    if client_request:
        deliver_translation(client_request, attachments, background_tasks)
    return result
