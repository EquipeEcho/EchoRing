"""Translation intake, quotes, client decisions and initial assignment."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from psycopg.types.json import Jsonb
from app.core.portal_auth import staff
from app.core.security import throttle
from app.database_pg import database, environment_flag, json_data, now
from app.models.translation import Intake, QuoteDecision, TranslatorAssignment, Update
from app.repositories.translation_store import _request_for_quote, add_event, read_request, read_service, sanitized_request, task_record
from app.services.email.quote_service import deliver_quote

router = APIRouter()


@router.post('/requests', status_code=201)
def create_request(data: Intake, request: Request):
    """Cria a solicitação pública e registra seu primeiro evento como recebida."""
    throttle(request, 'intake', 10)
    created_at = now()
    record = {**data.model_dump(), 'id': 'SOL-' + secrets.token_hex(6).upper(), 'createdAt': created_at, 'status': 'Recebido', 'demo': False}
    with database() as connection:
        connection.execute('INSERT INTO requests (id, data) VALUES (?, ?)', (record['id'], Jsonb(record)))
        add_event(connection, 'Recebido', request_id=record['id'], created_at=created_at)
        return sanitized_request(record, connection)


@router.get('/requests')
def list_requests(user: dict = Depends(staff)):
    """Lista as solicitações mais recentes para a equipe interna."""
    with database() as connection:
        rows = connection.execute('SELECT data FROM requests ORDER BY created_at DESC').fetchall()
        return [sanitized_request(json_data(row['data']), connection) for row in rows]


@router.get('/requests/{request_id}')
def request_detail(request_id: str, user: dict = Depends(staff)):
    """Entrega à equipe todos os dados da solicitação, incluindo os anexos."""
    with database() as connection:
        data, _ = read_request(connection, request_id)
        return sanitized_request(data, connection, include_content=True)


@router.patch('/requests/{request_id}')
def update_request(request_id: str, changes: Update, user: dict = Depends(staff)):
    """Salva o rascunho do orçamento enquanto a solicitação ainda aceita edição."""
    if changes.status is not None and changes.status != 'Em análise':
        raise HTTPException(422, 'Status inválido.')
    if changes.status is None and changes.quote is None:
        raise HTTPException(422, 'Nenhuma alteração informada.')
    with database() as connection:
        data, sending = read_request(connection, request_id, for_update=True)
        if sending or data['status'] not in ('Recebido', 'Em análise'):
            raise HTTPException(409, 'Esta solicitação não aceita mais alterações no orçamento.')
        previous_status = data['status']
        if changes.quote:
            previous_id = data.get('quote', {}).get('id')
            data['quote'] = {**changes.quote.model_dump(), **({'id': previous_id} if previous_id else {})}
            data['status'] = 'Em análise'
        if changes.status:
            data['status'] = changes.status
        if data['status'] == 'Em análise' and not data.get('analysisStartedAt'):
            data['analysisStartedAt'] = now()
        connection.execute('UPDATE requests SET data = ? WHERE id = ?', (Jsonb(data), request_id))
        if previous_status != data['status']:
            add_event(connection, data['status'], request_id=request_id, actor=user, created_at=data.get('analysisStartedAt'))
        return sanitized_request(data, connection, include_content=True)


@router.post('/requests/{request_id}/send-quote')
def send_quote(request_id: str, user: dict = Depends(staff)):
    """Protege contra envio duplicado e confirma o estado somente após enviar o e-mail."""
    auto_approve = environment_flag('AUTO_APPROVE_QUOTES')
    response_token = '' if auto_approve else secrets.token_urlsafe(48)
    with database() as connection:
        data, sending = read_request(connection, request_id, for_update=True)
        if sending or data['status'] == 'Orçamento enviado':
            raise HTTPException(409, 'Este orçamento já foi enviado ou está em envio.')
        if data['status'] != 'Em análise' or not data.get('quote'):
            raise HTTPException(422, 'Salve o orçamento e inicie a análise antes de enviar.')
        quote_id = data['quote'].get('id') or 'ORC-' + secrets.token_hex(6).upper()
        data['quote']['id'] = quote_id
        data['quoteResponseTokenDigest'] = hashlib.sha256(response_token.encode()).hexdigest()
        days = max(1, min(int(os.getenv('QUOTE_RESPONSE_DAYS', '30')), 365))
        data['quoteResponseExpiresAt'] = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        connection.execute('UPDATE requests SET data = ?, sending = TRUE WHERE id = ?', (Jsonb(data), request_id))
    # O envio fica fora da transação para não segurar o bloqueio do banco enquanto o SMTP responde.
    if auto_approve:
        approved_at = now()
        data.update(
            status='Orçamento aprovado', quoteDecision='approve',
            quoteRespondedAt=approved_at, autoApproved=True,
        )
        with database() as connection:
            connection.execute('UPDATE requests SET data = ?, sending = FALSE WHERE id = ?', (Jsonb(data), request_id))
            add_event(
                connection, 'Orçamento aprovado', request_id=request_id, actor=user,
                note='Aprovação automática habilitada para testes.', created_at=approved_at,
            )
            return sanitized_request(data, connection, include_content=True)
    try:
        deliver_quote(data, response_token)
    except Exception as error:
        with database() as connection:
            connection.execute('UPDATE requests SET sending = FALSE WHERE id = ?', (request_id,))
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(502, 'Não foi possível confirmar o envio pelo provedor. O rascunho foi preservado; confira a caixa de saída antes de tentar novamente.') from error
    sent_at = now()
    data.update(status='Orçamento enviado', emailSentAt=sent_at, quoteSentAt=sent_at)
    with database() as connection:
        connection.execute('UPDATE requests SET data = ?, sending = FALSE WHERE id = ?', (Jsonb(data), request_id))
        add_event(connection, 'Orçamento enviado', request_id=request_id, actor=user, created_at=sent_at)
        return sanitized_request(data, connection, include_content=True)


@router.post('/quotes/{quote_id}/decision')
def decide_quote(quote_id: str, decision: QuoteDecision, request: Request):
    """Valida o link pessoal e registra uma única decisão do cliente."""
    throttle(request, 'quote-decision', 20)
    with database() as connection:
        data = _request_for_quote(connection, quote_id)
        digest = hashlib.sha256(decision.token.encode()).hexdigest()
        if not data.get('quoteResponseTokenDigest') or not hmac.compare_digest(digest, data['quoteResponseTokenDigest']):
            raise HTTPException(403, 'Este link de orçamento é inválido.')
        try:
            expires = datetime.fromisoformat(data['quoteResponseExpiresAt'])
        except (KeyError, ValueError):
            raise HTTPException(403, 'Este link de orçamento é inválido.')
        if expires <= datetime.now(timezone.utc):
            raise HTTPException(410, 'Este link expirou. Entre em contato com a equipe para receber uma nova proposta.')
        if data['status'] != 'Orçamento enviado' or data.get('quoteRespondedAt'):
            raise HTTPException(409, 'Este orçamento já foi respondido.')
        status = 'Orçamento aprovado' if decision.decision == 'approve' else 'Orçamento recusado'
        responded_at = now()
        data.update(status=status, quoteDecision=decision.decision, quoteRespondedAt=responded_at)
        connection.execute('UPDATE requests SET data = ? WHERE id = ?', (Jsonb(data), data['id']))
        add_event(connection, status, request_id=data['id'], created_at=responded_at)
    return {'requestId': data['id'], 'quoteId': quote_id, 'title': data['title'], 'status': status, 'respondedAt': responded_at}


@router.post('/requests/{request_id}/assign', status_code=201)
def assign_translator(request_id: str, assignment: TranslatorAssignment, user: dict = Depends(staff)):
    """Cria uma tarefa para uma solicitação aprovada e vincula o tradutor escolhido."""
    with database() as connection:
        data, _ = read_request(connection, request_id, for_update=True)
        if data['status'] != 'Orçamento aprovado':
            raise HTTPException(409, 'A solicitação precisa ter um orçamento aprovado antes da atribuição.')
        if connection.execute('SELECT 1 FROM services WHERE request_id = ?', (request_id,)).fetchone():
            raise HTTPException(409, 'Esta solicitação já possui uma tarefa.')
        if connection.execute('SELECT 1 FROM job_offers WHERE request_id = ?', (request_id,)).fetchone():
            raise HTTPException(409, 'Esta solicitação utiliza ofertas. O tradutor precisa aceitar uma oportunidade.')
        assigned = connection.execute("SELECT id, name, email FROM users WHERE id = ? AND role = 'translator' AND active = TRUE AND onboarding_required = FALSE", (assignment.translatorId,)).fetchone()
        if not assigned:
            raise HTTPException(422, 'Selecione um tradutor ativo.')
        task_id = 'TRD-' + secrets.token_hex(6).upper()
        created_at = now()
        connection.execute(
            '''INSERT INTO services
               (id, request_id, title, translator_id, status, deadline, observations, source, target, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'Tradutor atribuído', ?, ?, ?, ?, ?, ?)''',
            (task_id, request_id, data['title'], assigned['id'], assignment.deadline, assignment.observations,
             data['source'], data['target'], created_at, created_at),
        )
        data.update(status='Tradutor atribuído', assignedAt=created_at, taskId=task_id,
                    translator={'id': assigned['id'], 'name': assigned['name'], 'email': assigned['email']})
        connection.execute('UPDATE requests SET data = ? WHERE id = ?', (Jsonb(data), request_id))
        add_event(connection, 'Tradutor atribuído', request_id, task_id, user, assignment.observations, created_at)
        if assignment.workflowTemplateId:
            from app.services.translation_workflows_service import assign_workflow
            assign_workflow(connection, read_service(connection, task_id), assignment.workflowTemplateId, user)
        return task_record(connection, read_service(connection, task_id))
