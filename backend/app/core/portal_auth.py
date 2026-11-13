"""Portal sessions, configured accounts and role/access dependencies."""
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.db_models import AuthSession, User
import hashlib
import os
import time
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import hash_password, password_matches
from app.database_pg import database

bearer = HTTPBearer(auto_error=False)


def configured_accounts():
    """Monta as contas iniciais definidas no ambiente e ignora e-mails repetidos."""
    accounts = []
    configured_emails = set()
    for prefix, role, default_name in (
        ('ADMIN', 'admin', 'Administrador Geral'),
        ('TRANSLATOR', 'translator', 'Tradutor Aliança'),
        ('STAFF', 'employee', 'Equipe Aliança'),
    ):
        email = os.getenv(f'{prefix}_EMAIL', '').strip().lower()
        password = os.getenv(f'{prefix}_PASSWORD', '')
        if email and len(password) >= 6 and email not in configured_emails:
            configured_emails.add(email)
            accounts.append({
                'id': hashlib.sha256(f'{role}:{email}'.encode()).hexdigest()[:32],
                'email': email, 'password': password,
                'name': os.getenv(f'{prefix}_NAME', default_name).strip() or default_name,
                'role': role,
            })
    return accounts


def sync_configured_accounts(session, accounts):
    """Cria ou atualiza as contas do ambiente sem recalcular hashes sem necessidade."""
    for account in accounts:
        existing = session.execute(select(User.password_hash).where(User.email == account['email'])).mappings().first()
        password_hash = existing['password_hash'] if existing and password_matches(account['password'], existing['password_hash']) else hash_password(account['password'])
        statement = pg_insert(User).values(
            id=account['id'], email=account['email'], name=account['name'],
            role=account['role'], password_hash=password_hash, active=True,
        )
        session.execute(
            statement.on_conflict_do_update(
                index_elements=[User.email],
                set_={key: statement.excluded[key] for key in ('name', 'role', 'password_hash', 'active')},
            )
        )


def authenticated_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    """Valida o token da sessão e devolve somente um usuário ativo e não expirado."""
    if not credentials:
        raise HTTPException(401, 'Entre com sua conta para continuar.')
    digest = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    with database() as session:
        account = session.execute(
            select(AuthSession.expires, User.id, User.name, User.email, User.role,
                   User.active, User.onboarding_required)
            .join(User, User.id == AuthSession.user_id)
            .where(AuthSession.digest == digest)
        ).mappings().first()
        if not account or account['expires'] <= time.time() or not account['active']:
            session.execute(delete(AuthSession).where(AuthSession.digest == digest))
            raise HTTPException(401, 'Sessão expirada. Entre novamente no portal.')
    return dict(account)


def staff(user: dict = Depends(authenticated_user)):
    """Restringe a rota à equipe interna e ao administrador."""
    if user['role'] not in ('admin', 'employee'):
        raise HTTPException(403, 'Sua conta não tem permissão para acessar esta área.')
    return user


def translator_account(user: dict = Depends(authenticated_user)):
    """Restringe a rota a usuários com papel de tradutor."""
    if user['role'] != 'translator':
        raise HTTPException(403, 'Somente tradutores podem acessar esta área.')
    return user


def workspace_user(user: dict = Depends(authenticated_user)):
    """Confere o cadastro no servidor, inclusive quando o cliente altera a sessão local."""
    if user['role'] == 'translator' and user.get('onboarding_required'):
        raise HTTPException(403, 'Conclua seu cadastro de tradutor antes de acessar projetos e entregas.')
    return user


def translator(user: dict = Depends(workspace_user)):
    return translator_account(user)


def administrator(user: dict = Depends(authenticated_user)):
    """Restringe o gerenciamento de contas ao administrador geral."""
    if user['role'] != 'admin':
        raise HTTPException(403, 'Somente o administrador geral pode gerenciar usuários.')
    return user


def public_user(user):
    """Remove do retorno os campos internos e sensíveis do usuário."""
    return {
        **{key: user[key] for key in ('name', 'email', 'role')},
        'onboardingRequired': user['role'] == 'translator' and bool(user.get('onboarding_required')),
    }


def user_record(user):
    """Formata um usuário para a API sem incluir seu hash de senha."""
    return {'id': user['id'], **public_user(user), 'active': bool(user['active'])}


def ensure_task_access(service, user):
    """Libera a equipe ou somente o tradutor que realmente recebeu a tarefa."""
    if user['role'] in ('admin', 'employee'):
        return
    if user['role'] != 'translator' or service['translator_id'] != user['id']:
        raise HTTPException(403, 'Esta tarefa não está atribuída à sua conta.')
