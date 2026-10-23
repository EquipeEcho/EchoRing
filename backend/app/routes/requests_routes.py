"""Routes for portal authentication, user management, translation requests and quotes."""

import hashlib
import hmac
import os
import secrets
import sys
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from pymongo.errors import DuplicateKeyError, PyMongoError
from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.exc import IntegrityError

from app.core.email_service import deliver_quote, notify_translator_assigned
from app.core.portal_auth import (
    SESSION_SECONDS,
    administrator,
    authenticated_user,
    bearer,
    configured_accounts,
    hash_password,
    password_matches,
    public_user,
    staff,
    sync_configured_accounts,
    throttle,
    translator_account,
    user_record,
)
from app.core.workflow import (
    _request_for_quote,
    add_event,
    read_request,
    read_service,
    sanitized_request,
    task_record,
)
from app.database_pg import database, environment_flag, json_data, now, to_datetime
from app.db_models import AuthSession, Service, TranslationRequest, User
from app.models.translation import (
    ClientCreate,
    Intake,
    Login,
    QuoteDecision,
    TranslatorAssignment,
    Update,
    UserCreate,
)
from app.repositories import translator_profile_store as profile_store
from app.repositories import client_store
from translator_profiles import TranslatorProfileComplete, TranslatorProfileDraft

router = APIRouter()

USER_PUBLIC_COLUMNS = (User.id, User.name, User.email, User.role, User.active, User.onboarding_required)


@router.post('/auth/login')
@router.post('/staff/login', include_in_schema=False)
def login(data: Login, request: Request):
    throttle(request, 'auth-login', 5)
    accounts = configured_accounts()
    with database() as session:
        sync_configured_accounts(session, accounts)
        candidate = session.execute(
            select(User.__table__).where(User.email == data.email.strip().lower())
        ).mappings().first()
    fallback = 'pbkdf2_sha256$600000$00000000000000000000000000000000$33d727f3156a25e032f442eb429832a86bc213bd395aa8e59f4ebc754c54ddef'
    valid_password = password_matches(data.password, candidate['password_hash'] if candidate else fallback)
    if not candidate or not candidate['active'] or not valid_password:
        raise HTTPException(401, 'E-mail ou senha incorretos.')
    user = dict(candidate)
    token = secrets.token_urlsafe(48)
    expires = time.time() + SESSION_SECONDS
    with database() as session:
        session.execute(delete(AuthSession).where(AuthSession.expires <= time.time()))
        session.execute(
            insert(AuthSession).values(
                digest=hashlib.sha256(token.encode()).hexdigest(), expires=expires, user_id=user['id'],
            )
        )
    return {'token': token, 'expires': expires, **public_user(user)}


@router.get('/auth/me')
def me(user: dict = Depends(authenticated_user)):
    return public_user(user)


@router.post('/auth/logout')
@router.post('/staff/logout', include_in_schema=False)
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), user: dict = Depends(authenticated_user)):
    digest = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    with database() as session:
        session.execute(delete(AuthSession).where(AuthSession.digest == digest))
    return {'ok': True}


@router.get('/users')
def list_users(admin: dict = Depends(administrator)):
    with database() as session:
        sync_configured_accounts(session, configured_accounts())
        users = session.execute(select(*USER_PUBLIC_COLUMNS).order_by(func.lower(User.name))).mappings().all()
    return [user_record(user) for user in users]


@router.post('/users', status_code=201)
def create_user(data: UserCreate, admin: dict = Depends(administrator)):
    try:
        with database() as session:
            if session.execute(select(User.id).where(User.email == data.email)).first():
                raise HTTPException(409, 'Já existe uma conta com este e-mail.')
            user_id = secrets.token_hex(16)
            session.execute(
                insert(User).values(
                    id=user_id, email=data.email, name=data.name, role=data.role,
                    password_hash=hash_password(data.password), active=True,
                    onboarding_required=data.role == 'translator',
                )
            )
            user = session.execute(select(*USER_PUBLIC_COLUMNS).where(User.id == user_id)).mappings().first()
    except IntegrityError as error:
        raise HTTPException(409, 'Já existe uma conta com este e-mail.') from error
    return user_record(user)


@router.get('/translators')
def list_translators(user: dict = Depends(staff)):
    with database() as session:
        sync_configured_accounts(session, configured_accounts())
        users = session.execute(
            select(*USER_PUBLIC_COLUMNS)
            .where(User.role == 'translator', User.active.is_(True), User.onboarding_required.is_(False))
            .order_by(func.lower(User.name))
        ).mappings().all()
    return [user_record(item) for item in users]


def translator_profile_record(user):
    """Combina a conta relacional com o cadastro profissional persistido no MongoDB."""
    record = profile_store.find_profile(user['id'])
    profile = TranslatorProfileDraft.model_validate(record['data'] if record else {'fullName': user['name']})
    return {
        'profile': profile.model_dump(), 'account': public_user(user),
        'completedAt': record.get('completed_at') if record else None,
        'updatedAt': record.get('updated_at') if record else None,
    }


@router.get('/translator-profile/me')
def read_translator_profile(user: dict = Depends(translator_account)):
    """Dados privados do próprio tradutor, reutilizáveis pela futura página de perfil."""
    with database() as session:
        current = session.execute(select(User.__table__).where(User.id == user['id'])).mappings().first()
    return translator_profile_record(dict(current))


@router.patch('/translator-profile/me')
def save_translator_profile_draft(data: TranslatorProfileDraft, user: dict = Depends(translator_account)):
    """Salva o formulário incompleto sem liberar o acesso ao portal."""
    with database() as session:
        current = session.execute(
            select(User.__table__).where(User.id == user['id']).with_for_update()
        ).mappings().first()
        if not current['onboarding_required']:
            raise HTTPException(409, 'Seu cadastro já está concluído. Atualizações devem utilizar o perfil completo.')
        previous = profile_store.find_profile(user['id'])
        merged = TranslatorProfileDraft.model_validate({
            **(previous['data'] if previous else {'fullName': current['name']}),
            **data.model_dump(exclude_unset=True),
        })
        profile_store.save_draft(user['id'], merged.model_dump(), now())
    return translator_profile_record(dict(current))


@router.put('/translator-profile/me')
def complete_translator_profile(data: TranslatorProfileComplete, user: dict = Depends(translator_account)):
    """Persiste o perfil no MongoDB e libera o acesso à conta no PostgreSQL."""
    with database() as session:
        current = session.execute(
            select(User.__table__).where(User.id == user['id']).with_for_update()
        ).mappings().first()
        profile_store.save_complete(user['id'], data.model_dump(), now())
        session.execute(
            update(User).where(User.id == user['id']).values(name=data.fullName, onboarding_required=False)
        )
    return translator_profile_record({**dict(current), 'name': data.fullName, 'onboarding_required': False})


@router.get('/clients')
def list_clients(user: dict = Depends(staff)):
    clients = client_store.list_clients()
    with database() as session:
        rows = session.execute(
            select(
                TranslationRequest.data,
                Service.id.label('service_id'),
                Service.status.label('service_status'),
            )
            .select_from(TranslationRequest)
            .outerjoin(Service, Service.request_id == TranslationRequest.id)
            .order_by(TranslationRequest.created_at.desc())
        ).mappings().all()

    projects_by_email = {}
    for row in rows:
        project = json_data(row['data'])
        email = project.get('email', '').strip().lower()
        if not email:
            continue
        projects_by_email.setdefault(email, []).append({
            'id': project['id'],
            'title': project['title'],
            'service': project['service'],
            'status': row['service_status'] or project['status'],
            'requestStatus': project['status'],
            'createdAt': project['createdAt'],
        })

    for client in clients:
        client['projects'] = projects_by_email.get(client['email'].lower(), [])
    return clients


@router.post('/clients', status_code=201)
def create_client(data: ClientCreate, user: dict = Depends(staff)):
    client_id = 'CLI-' + secrets.token_hex(6).upper()
    try:
        return client_store.create_client(client_id, data, user['id'], datetime.now(timezone.utc))
    except DuplicateKeyError as error:
        raise HTTPException(409, 'Já existe um cliente cadastrado com este e-mail.') from error


@router.post('/requests', status_code=201)
def create_request(data: Intake, request: Request):
    throttle(request, 'intake', 10)
    created_at = now()
    record = {**data.model_dump(), 'id': 'SOL-' + secrets.token_hex(6).upper(), 'createdAt': created_at, 'status': 'Recebido', 'demo': False}
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
def list_requests(user: dict = Depends(staff)):
    with database() as session:
        rows = session.execute(
            select(TranslationRequest.data).order_by(TranslationRequest.created_at.desc())
        ).mappings().all()
        return [sanitized_request(json_data(row['data']), session) for row in rows]


@router.get('/requests/{request_id}')
def request_detail(request_id: str, user: dict = Depends(staff)):
    with database() as session:
        data, _ = read_request(session, request_id)
        return sanitized_request(data, session, include_content=True)


@router.patch('/requests/{request_id}')
def update_request(request_id: str, changes: Update, user: dict = Depends(staff)):
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
            previous_id = data.get('quote', {}).get('id')
            data['quote'] = {**changes.quote.model_dump(), **({'id': previous_id} if previous_id else {})}
            data['status'] = 'Em análise'
        if changes.status:
            data['status'] = changes.status
        if data['status'] == 'Em análise' and not data.get('analysisStartedAt'):
            data['analysisStartedAt'] = now()
        session.execute(update(TranslationRequest).where(TranslationRequest.id == request_id).values(data=data))
        if previous_status != data['status']:
            add_event(session, data['status'], request_id=request_id, actor=user, created_at=data.get('analysisStartedAt'))
        return sanitized_request(data, session, include_content=True)


@router.post('/requests/{request_id}/send-quote')
def send_quote(request_id: str, user: dict = Depends(staff)):
    auto_approve = environment_flag('AUTO_APPROVE_QUOTES')
    response_token = '' if auto_approve else secrets.token_urlsafe(48)
    with database() as session:
        data, sending = read_request(session, request_id, for_update=True)
        if sending or data['status'] == 'Orçamento enviado':
            raise HTTPException(409, 'Este orçamento já foi enviado ou está em envio.')
        if data['status'] != 'Em análise' or not data.get('quote'):
            raise HTTPException(422, 'Salve o orçamento e inicie a análise antes de enviar.')
        quote_id = data['quote'].get('id') or 'ORC-' + secrets.token_hex(6).upper()
        data['quote']['id'] = quote_id
        data['quoteResponseTokenDigest'] = hashlib.sha256(response_token.encode()).hexdigest()
        days = max(1, min(int(os.getenv('QUOTE_RESPONSE_DAYS', '30')), 365))
        data['quoteResponseExpiresAt'] = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        session.execute(
            update(TranslationRequest).where(TranslationRequest.id == request_id).values(data=data, sending=True)
        )
    if auto_approve:
        approved_at = now()
        data.update(
            status='Orçamento aprovado', quoteDecision='approve',
            quoteRespondedAt=approved_at, autoApproved=True,
        )
        with database() as session:
            session.execute(
                update(TranslationRequest).where(TranslationRequest.id == request_id).values(data=data, sending=False)
            )
            add_event(
                session, 'Orçamento aprovado', request_id=request_id, actor=user,
                note='Aprovação automática habilitada para testes.', created_at=approved_at,
            )
            return sanitized_request(data, session, include_content=True)
    try:
        quote_sender = getattr(sys.modules.get('requests_api'), 'deliver_quote', deliver_quote)
        quote_sender(data, response_token)
    except Exception as error:
        with database() as session:
            session.execute(update(TranslationRequest).where(TranslationRequest.id == request_id).values(sending=False))
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(502, 'Não foi possível confirmar o envio pelo provedor. O rascunho foi preservado; confira a caixa de saída antes de tentar novamente.') from error
    sent_at = now()
    data.update(status='Orçamento enviado', emailSentAt=sent_at, quoteSentAt=sent_at)
    with database() as session:
        session.execute(
            update(TranslationRequest).where(TranslationRequest.id == request_id).values(data=data, sending=False)
        )
        add_event(session, 'Orçamento enviado', request_id=request_id, actor=user, created_at=sent_at)
        return sanitized_request(data, session, include_content=True)


@router.post('/quotes/{quote_id}/decision')
def decide_quote(quote_id: str, decision: QuoteDecision, request: Request):
    throttle(request, 'quote-decision', 20)
    with database() as session:
        data = _request_for_quote(session, quote_id)
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
        session.execute(update(TranslationRequest).where(TranslationRequest.id == data['id']).values(data=data))
        add_event(session, status, request_id=data['id'], created_at=responded_at)
    return {'requestId': data['id'], 'quoteId': quote_id, 'title': data['title'], 'status': status, 'respondedAt': responded_at}


@router.post('/requests/{request_id}/assign', status_code=201)
def assign_translator(request_id: str, assignment: TranslatorAssignment, background_tasks: BackgroundTasks, user: dict = Depends(staff)):
    with database() as session:
        data, _ = read_request(session, request_id, for_update=True)
        if data['status'] != 'Orçamento aprovado':
            raise HTTPException(409, 'A solicitação precisa ter um orçamento aprovado antes da atribuição.')
        if session.execute(select(Service.id).where(Service.request_id == request_id)).first():
            raise HTTPException(409, 'Esta solicitação já possui uma tarefa.')
        assigned = session.execute(
            select(User.id, User.name, User.email).where(
                User.id == assignment.translatorId,
                User.role == 'translator',
                User.active.is_(True),
                User.onboarding_required.is_(False),
            )
        ).mappings().first()
        if not assigned:
            raise HTTPException(422, 'Selecione um tradutor ativo.')
        task_id = 'TRD-' + secrets.token_hex(6).upper()
        created_at = now()
        session.execute(
            insert(Service).values(
                id=task_id, request_id=request_id, title=data['title'], translator_id=assigned['id'],
                status='Tradutor atribuído', deadline=assignment.deadline,
                observations=assignment.observations, source=data['source'], target=data['target'],
                created_at=to_datetime(created_at), updated_at=to_datetime(created_at),
            )
        )
        data.update(status='Tradutor atribuído', assignedAt=created_at, taskId=task_id,
                    translator={'id': assigned['id'], 'name': assigned['name'], 'email': assigned['email']})
        session.execute(update(TranslationRequest).where(TranslationRequest.id == request_id).values(data=data))
        add_event(session, 'Tradutor atribuído', request_id, task_id, user, assignment.observations, created_at)
        task = task_record(session, read_service(session, task_id))
    notify_translator_assigned(assigned, data, task_id, assignment.deadline, background_tasks)
    return task