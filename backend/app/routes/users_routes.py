"""Administrative platform account endpoints."""

import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, insert, select
from sqlalchemy.exc import IntegrityError

from app.core.portal_auth import (
    administrator,
    configured_accounts,
    sync_configured_accounts,
    user_record,
)
from app.core.security import hash_password
from app.database_pg import database
from app.db_models import User
from app.models.user import UserCreate

router = APIRouter()


@router.get('/users')
def list_users(admin: dict = Depends(administrator)):
    """Lista as contas cadastradas depois de sincronizar as contas do ambiente."""
    with database() as session:
        sync_configured_accounts(session, configured_accounts())
        users = (
            session.execute(
                select(User.id, User.name, User.email, User.role, User.active, User.onboarding_required).order_by(
                    func.lower(User.name)
                )
            )
            .mappings()
            .all()
        )
    return [user_record(user) for user in users]


@router.post('/users', status_code=201)
def create_user(data: UserCreate, admin: dict = Depends(administrator)):
    """Cadastra uma conta com senha protegida e impede e-mails duplicados."""
    try:
        with database() as session:
            if session.execute(select(1).select_from(User).where(User.email == data.email)).mappings().first():
                raise HTTPException(409, 'Já existe uma conta com este e-mail.')
            user_id = secrets.token_hex(16)
            session.execute(
                insert(User).values(
                    id=user_id,
                    email=data.email,
                    name=data.name,
                    role=data.role,
                    password_hash=hash_password(data.password),
                    active=True,
                    onboarding_required=data.role == 'translator',
                )
            )
            user = (
                session.execute(
                    select(User.id, User.name, User.email, User.role, User.active, User.onboarding_required).where(
                        User.id == user_id
                    )
                )
                .mappings()
                .first()
            )
    except IntegrityError as error:
        raise HTTPException(409, 'Já existe uma conta com este e-mail.') from error
    return user_record(user)
