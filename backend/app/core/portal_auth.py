"""Authentication, password hashing, rate limiting and role dependencies."""

import hashlib
import hmac
import os
import secrets
import threading
import time

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database_pg import database

bearer = HTTPBearer(auto_error=False)
_lock = threading.Lock()
_attempts: dict[tuple[str, str], list[float]] = {}
PASSWORD_ITERATIONS = 600_000
SESSION_SECONDS = 8 * 60 * 60


def throttle(request: Request, category: str, maximum: int):
    key = (request.client.host if request.client else 'unknown', category)
    timestamp = time.time()
    with _lock:
        for old_key in list(_attempts):
            _attempts[old_key] = [value for value in _attempts[old_key] if value > timestamp - 60]
            if not _attempts[old_key]:
                del _attempts[old_key]
        values = _attempts.setdefault(key, [])
        if len(values) >= maximum:
            raise HTTPException(429, 'Muitas tentativas. Aguarde um minuto e tente novamente.')
        values.append(timestamp)


def hash_password(password: str):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PASSWORD_ITERATIONS)
    return f'pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}'


def password_matches(password: str, encoded: str):
    try:
        algorithm, iterations, salt, expected = encoded.split('$', 3)
        if algorithm != 'pbkdf2_sha256':
            return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (TypeError, ValueError):
        return False


def configured_accounts():
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


def sync_configured_accounts(connection, accounts):
    for account in accounts:
        existing = connection.execute('SELECT password_hash FROM users WHERE email = ?', (account['email'],)).fetchone()
        password_hash = existing['password_hash'] if existing and password_matches(account['password'], existing['password_hash']) else hash_password(account['password'])
        connection.execute(
            '''INSERT INTO users (id, email, name, role, password_hash, active) VALUES (?, ?, ?, ?, ?, TRUE)
               ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role,
               password_hash = excluded.password_hash, active = TRUE''',
            (account['id'], account['email'], account['name'], account['role'], password_hash),
        )


def authenticated_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not credentials:
        raise HTTPException(401, 'Entre com sua conta para continuar.')
    digest = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    with database() as connection:
        session = connection.execute(
            '''SELECT sessions.expires, users.id, users.name, users.email, users.role, users.active,
                      users.onboarding_required
               FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.digest = ?''',
            (digest,),
        ).fetchone()
        if not session or session['expires'] <= time.time() or not session['active']:
            connection.execute('DELETE FROM sessions WHERE digest = ?', (digest,))
            raise HTTPException(401, 'Sessão expirada. Entre novamente no portal.')
    return dict(session)


def staff(user: dict = Depends(authenticated_user)):
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