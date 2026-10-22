"""Administrative platform account endpoints."""
import secrets
import psycopg
from fastapi import APIRouter, Depends, HTTPException
from app.core.portal_auth import administrator, configured_accounts, sync_configured_accounts, user_record
from app.core.security import hash_password
from app.database_pg import database
from app.models.user import UserCreate

router = APIRouter()


@router.get('/users')
def list_users(admin: dict = Depends(administrator)):
    """Lista as contas cadastradas depois de sincronizar as contas do ambiente."""
    with database() as connection:
        sync_configured_accounts(connection, configured_accounts())
        users = connection.execute('SELECT id, name, email, role, active, onboarding_required FROM users ORDER BY LOWER(name)').fetchall()
    return [user_record(user) for user in users]


@router.post('/users', status_code=201)
def create_user(data: UserCreate, admin: dict = Depends(administrator)):
    """Cadastra uma conta com senha protegida e impede e-mails duplicados."""
    try:
        with database() as connection:
            if connection.execute('SELECT 1 FROM users WHERE email = ?', (data.email,)).fetchone():
                raise HTTPException(409, 'Já existe uma conta com este e-mail.')
            user_id = secrets.token_hex(16)
            connection.execute(
                'INSERT INTO users (id, email, name, role, password_hash, active, onboarding_required) VALUES (?, ?, ?, ?, ?, TRUE, ?)',
                (user_id, data.email, data.name, data.role, hash_password(data.password), data.role == 'translator'),
            )
            user = connection.execute('SELECT id, name, email, role, active, onboarding_required FROM users WHERE id = ?', (user_id,)).fetchone()
    except psycopg.IntegrityError as error:
        raise HTTPException(409, 'Já existe uma conta com este e-mail.') from error
    return user_record(user)
