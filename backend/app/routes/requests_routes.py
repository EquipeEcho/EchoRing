"""Translation intake, quotes, client decisions and initial assignment."""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pymongo.errors import PyMongoError
from sqlalchemy import and_, insert, select, update

from app.core.languages import language
from app.core.portal_auth import staff
from app.core.request_groups import group_counts, resolve_statuses
from app.core.security import throttle
from app.core.translation_scope import (
    approved_amount,
    approved_request,
    request_targets,
    resolve_target,
    validate_quote_scope,
)
from app.database_pg import database, environment_flag, now, to_datetime
from app.db_models import JobOffer, Service, TranslationRequest, User
from app.models.translation import (
    Intake,
    QuoteAccess,
    QuoteDecision,
    TranslatorAssignment,
    Update,
)
from app.repositories import client_store
from app.repositories.translation_store import (
    _request_for_quote,
    add_event,
    list_requests_page,
    read_request,
    read_service,
    sanitized_request,
    task_record,
    update_request_status,
)
from app.services.email.quote_service import deliver_quote
from app.services.email.workflow_service import notify_translator_assigned

router = APIRouter()


@router.post('/requests', status_code=201)
def create_request(data: Intake, request: Request):
    """Cria a solicitação pública e registra seu primeiro evento como recebida."""
    throttle(request, 'intake', 10)
    created_at = now()
    record = {
        **data.model_dump(),
        'id': 'SOL-' + secrets.token_hex(6).upper(),
        'createdAt': created_at,
        'status': 'Recebido',
        'demo': False,
    }
    with database() as session:
        session.execute(insert(TranslationRequest).values(id=record['id'], data=record))
        add_event(session, 'Recebido', request_id=record['id'], created_at=created_at)
        response = sanitized_request(record, session)
    try:
        client_store.upsert_quote_client(data, datetime.fromisoformat(created_at))
    except PyMongoError as error:
        raise HTTPException(
            503,
            f'A solicitação {record["id"]} foi recebida, mas não foi possível salvar os dados do cliente. '
            'Entre em contato com a equipe informando este protocolo.',
        ) from error
    return response


@router.post('/requests/manual', status_code=201)
def create_manual_request(data: Intake, user: dict = Depends(staff)):
    created_at = now()
    record = {
        **data.model_dump(),
        'id': 'SOL-' + secrets.token_hex(6).upper(),
        'createdAt': created_at,
        'status': 'Recebido',
        'demo': False,
    }
    with database() as session:
        session.execute(insert(TranslationRequest).values(id=record['id'], data=record))
        add_event(
            session,
            'Recebido',
            request_id=record['id'],
            actor=user,
            note='Cadastro manual do cliente.',
            created_at=created_at,
        )
        return sanitized_request(record, session)


@router.get('/requests')
def list_requests(
    status: str | None = Query(None, max_length=300),
    search: str = Query('', max_length=120),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(staff),
):
    """Lista as solicitações da equipe com filtro por grupo ou status, busca e paginação."""
    statuses = resolve_statuses(status)
    with database() as session:
        records, total, status_counts = list_requests_page(session, statuses, search, limit, offset)
        return {
            'items': [sanitized_request(record, session) for record in records],
            'total': total,
            'limit': limit,
            'offset': offset,
            'counts': {'groups': group_counts(status_counts), 'statuses': status_counts},
        }


@router.get('/requests/{request_id}')
def request_detail(request_id: str, user: dict = Depends(staff)):
    """Entrega à equipe todos os dados da solicitação, incluindo os anexos."""
    with database() as session:
        data, _ = read_request(session, request_id)
        return sanitized_request(data, session, include_content=True)


@router.patch('/requests/{request_id}')
def update_request(request_id: str, changes: Update, user: dict = Depends(staff)):
    """Salva o rascunho do orçamento enquanto a solicitação ainda aceita edição."""
    if changes.status is not None and changes.status != 'Em análise':
        raise HTTPException(422, 'Status inválido.')
    if changes.status is None and changes.quote is None:
        raise HTTPException(422, 'Nenhuma alteração informada.')
    with database() as session:
        data, sending = read_request(session, request_id, for_update=True)
        if sending or data['status'] not in ('Recebido', 'Em análise'):
            raise HTTPException(409, 'Esta solicitação não aceita mais alterações no orçamento.')
        previous_status = data['status']
        if changes.quote:
            proposal = changes.quote.model_dump()
            validate_quote_scope(data, proposal)
            previous_id = data.get('quote', {}).get('id')
            data['quote'] = {**proposal, **({'id': previous_id} if previous_id else {})}
            data['status'] = 'Em análise'
        if changes.status:
            data['status'] = changes.status
        if data['status'] == 'Em análise' and not data.get('analysisStartedAt'):
            data['analysisStartedAt'] = now()
        session.execute(update(TranslationRequest).values(data=data).where(TranslationRequest.id == request_id))
        if previous_status != data['status']:
            add_event(
                session, data['status'], request_id=request_id, actor=user, created_at=data.get('analysisStartedAt')
            )
        return sanitized_request(data, session, include_content=True)


@router.post('/requests/{request_id}/send-quote')
def send_quote(request_id: str, user: dict = Depends(staff)):
    """Protege contra envio duplicado e confirma o estado somente após enviar o e-mail."""
    auto_approve = environment_flag('AUTO_APPROVE_QUOTES')
    response_token = '' if auto_approve else secrets.token_urlsafe(48)
    with database() as session:
        data, sending = read_request(session, request_id, for_update=True)
        if sending or data['status'] == 'Orçamento enviado':
            raise HTTPException(409, 'Este orçamento já foi enviado ou está em envio.')
        if data['status'] != 'Em análise' or not data.get('quote'):
            raise HTTPException(422, 'Salve o orçamento e inicie a análise antes de enviar.')
        validate_quote_scope(data, data['quote'])
        quote_id = data['quote'].get('id') or 'ORC-' + secrets.token_hex(6).upper()
        data['quote']['id'] = quote_id
        data['quoteResponseTokenDigest'] = hashlib.sha256(response_token.encode()).hexdigest()
        days = max(1, min(int(os.getenv('QUOTE_RESPONSE_DAYS', '30')), 365))
        data['quoteResponseExpiresAt'] = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        session.execute(
            update(TranslationRequest).values(data=data, sending=True).where(TranslationRequest.id == request_id)
        )
    # O envio fica fora da transação para não segurar o bloqueio do banco enquanto o SMTP responde.
    if auto_approve:
        approved_at = now()
        data.update(
            status='Orçamento aprovado',
            quoteDecision='approve',
            quoteRespondedAt=approved_at,
            autoApproved=True,
            approvedTargets=request_targets(data),
            approvedAmount=data['quote']['amount'],
        )
        with database() as session:
            session.execute(
                update(TranslationRequest).values(data=data, sending=False).where(TranslationRequest.id == request_id)
            )
            add_event(
                session,
                'Orçamento aprovado',
                request_id=request_id,
                actor=user,
                note='Aprovação automática habilitada para testes.',
                created_at=approved_at,
            )
            return sanitized_request(data, session, include_content=True)
    try:
        deliver_quote(data, response_token)
    except Exception as error:
        with database() as session:
            session.execute(update(TranslationRequest).values(sending=False).where(TranslationRequest.id == request_id))
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(
            502,
            'Não foi possível confirmar o envio pelo provedor. O rascunho foi preservado; confira a caixa de saída antes de tentar novamente.',
        ) from error
    sent_at = now()
    data.update(status='Orçamento enviado', emailSentAt=sent_at, quoteSentAt=sent_at)
    with database() as session:
        session.execute(
            update(TranslationRequest).values(data=data, sending=False).where(TranslationRequest.id == request_id)
        )
        add_event(session, 'Orçamento enviado', request_id=request_id, actor=user, created_at=sent_at)
        return sanitized_request(data, session, include_content=True)


def authorized_quote(session, quote_id, token):
    data = _request_for_quote(session, quote_id)
    digest = hashlib.sha256(token.encode()).hexdigest()
    if not data.get('quoteResponseTokenDigest') or not hmac.compare_digest(digest, data['quoteResponseTokenDigest']):
        raise HTTPException(403, 'Este link de orçamento é inválido.')
    try:
        expires = datetime.fromisoformat(data['quoteResponseExpiresAt'])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(403, 'Este link de orçamento é inválido.')
    if expires.tzinfo is None:
        raise HTTPException(403, 'Este link de orçamento é inválido.')
    if expires <= datetime.now(timezone.utc):
        raise HTTPException(410, 'Este link expirou. Entre em contato com a equipe para receber uma nova proposta.')
    if data['status'] != 'Orçamento enviado' or data.get('quoteRespondedAt'):
        raise HTTPException(409, 'Este orçamento já foi respondido.')
    return data


@router.post('/quotes/{quote_id}/preview')
def preview_quote(quote_id: str, access: QuoteAccess, request: Request):
    throttle(request, 'quote-preview', 40)
    with database() as session:
        data = authorized_quote(session, quote_id, access.token)
        return {key: data[key] for key in ('id', 'title', 'service', 'source', 'quote')} | {
            'targets': request_targets(data)
        }


@router.post('/quotes/{quote_id}/decision')
def decide_quote(quote_id: str, decision: QuoteDecision, request: Request):
    """One atomic decision may approve a subset of the priced languages."""
    throttle(request, 'quote-decision', 20)
    with database() as session:
        data = authorized_quote(session, quote_id, decision.token)
        targets = []
        if decision.decision == 'approve':
            if len(request_targets(data)) > 1 and not decision.targets:
                raise HTTPException(422, 'Selecione pelo menos um idioma para aprovar.')
            targets = [
                resolve_target(data, target)
                for target in (decision.targets if decision.targets is not None else request_targets(data))
            ]
            if not targets or len(set(map(language, targets))) != len(targets):
                raise HTTPException(422, 'Selecione idiomas diferentes para aprovar.')
        elif decision.targets:
            raise HTTPException(422, 'A recusa não pode conter idiomas aprovados.')
        amount = approved_amount(data['quote'], targets)
        status = 'Orçamento aprovado' if decision.decision == 'approve' else 'Orçamento recusado'
        responded_at = now()
        data.update(
            status=status,
            quoteDecision=decision.decision,
            quoteRespondedAt=responded_at,
            approvedTargets=targets,
            approvedAmount=str(amount),
        )
        session.execute(update(TranslationRequest).values(data=data).where(TranslationRequest.id == data['id']))
        add_event(
            session,
            status,
            request_id=data['id'],
            created_at=responded_at,
            note='Idiomas aprovados: ' + ', '.join(targets) if targets else 'Proposta recusada.',
        )
    return {
        'requestId': data['id'],
        'quoteId': quote_id,
        'title': data['title'],
        'status': status,
        'respondedAt': responded_at,
        'approvedTargets': targets,
        'approvedAmount': str(amount),
    }


@router.post('/requests/{request_id}/assign', status_code=201)
def assign_translator(
    request_id: str, assignment: TranslatorAssignment, background_tasks: BackgroundTasks, user: dict = Depends(staff)
):
    """Cria uma tarefa para uma solicitação aprovada e vincula o tradutor escolhido."""
    with database() as session:
        data, _ = read_request(session, request_id, for_update=True)
        if not approved_request(data):
            raise HTTPException(409, 'A solicitação precisa ter um orçamento aprovado antes da atribuição.')
        target = resolve_target(data, assignment.target, approved=True)
        if (
            session.execute(
                select(1).select_from(Service).where(and_(Service.request_id == request_id, Service.target == target))
            )
            .mappings()
            .first()
        ):
            raise HTTPException(409, 'Este idioma já possui uma tarefa.')
        if (
            session.execute(
                select(1)
                .select_from(JobOffer)
                .where(and_(JobOffer.request_id == request_id, JobOffer.target == target))
            )
            .mappings()
            .first()
        ):
            raise HTTPException(409, 'Esta solicitação utiliza ofertas. O tradutor precisa aceitar uma oportunidade.')
        assigned = (
            session.execute(
                select(User.id, User.name, User.email).where(
                    and_(
                        User.id == assignment.translatorId,
                        User.role == 'translator',
                        User.active.is_(True),
                        User.onboarding_required.is_(False),
                    )
                )
            )
            .mappings()
            .first()
        )
        if not assigned:
            raise HTTPException(422, 'Selecione um tradutor ativo.')
        task_id = 'TRD-' + secrets.token_hex(6).upper()
        created_at = now()
        session.execute(
            insert(Service).values(
                id=task_id,
                request_id=request_id,
                title=data['title'],
                translator_id=assigned['id'],
                status='Tradutor atribuído',
                deadline=assignment.deadline,
                observations=assignment.observations,
                source=data['source'],
                target=target,
                created_at=to_datetime(created_at),
                updated_at=to_datetime(created_at),
            )
        )
        update_request_status(
            session, request_id, 'Tradutor atribuído', user, assignment.observations, task_id, 'assignedAt'
        )
        if assignment.workflowTemplateId:
            from app.services.translation_workflows_service import assign_workflow

            assign_workflow(session, read_service(session, task_id), assignment.workflowTemplateId, user)
        task = task_record(session, read_service(session, task_id))
    notify_translator_assigned(assigned, {**data, 'target': target}, task_id, assignment.deadline, background_tasks)
    return task
