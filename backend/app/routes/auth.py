"""Authentication endpoints for portal sessions."""
from sqlalchemy import delete, insert, select
from app.db_models import AuthSession, User
import hashlib
import secrets
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from app.core.portal_auth import authenticated_user, bearer, configured_accounts, public_user, sync_configured_accounts
from app.core.security import SESSION_SECONDS, password_matches, throttle
from app.database_pg import database
from app.models.auth import Login

router = APIRouter()


@router.post('/auth/login')
@router.post('/staff/login', include_in_schema=False)
def login(data: Login, request: Request):
    """Autentica a conta e salva apenas o resumo criptográfico do token da sessão."""
    throttle(request, 'auth-login', 5)
    accounts = configured_accounts()
    with database() as session:
        sync_configured_accounts(session, accounts)
        candidate = session.execute(select(User.__table__).where(User.email == data.email.strip().lower())).mappings().first()
    fallback = 'pbkdf2_sha256$600000$00000000000000000000000000000000$33d727f3156a25e032f442eb429832a86bc213bd395aa8e59f4ebc754c54ddef'
    valid_password = password_matches(data.password, candidate['password_hash'] if candidate else fallback)
    if not candidate or not candidate['active'] or not valid_password:
        raise HTTPException(401, 'E-mail ou senha incorretos.')
    user = dict(candidate)
    token = secrets.token_urlsafe(48)
    expires = time.time() + SESSION_SECONDS
    with database() as session:
        session.execute(delete(AuthSession).where(AuthSession.expires <= time.time()))
        session.execute(insert(AuthSession).values(digest=hashlib.sha256(token.encode()).hexdigest(), expires=expires, user_id=user['id']))
    return {'token': token, 'expires': expires, **public_user(user)}


@router.get('/auth/me')
def me(user: dict = Depends(authenticated_user)):
    """Retorna os dados públicos da conta ligada ao token atual."""
    return public_user(user)


@router.post('/auth/logout')
@router.post('/staff/logout', include_in_schema=False)
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), user: dict = Depends(authenticated_user)):
    """Encerra a sessão removendo do banco o resumo do token recebido."""
    digest = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    with database() as session:
        session.execute(delete(AuthSession).where(AuthSession.digest == digest))
    return {'ok': True}
