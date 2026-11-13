"""Translator listing, onboarding and owner/team profile endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.portal_auth import (
    authenticated_user,
    configured_accounts,
    staff,
    sync_configured_accounts,
    translator_account,
    user_record,
)
from app.database_pg import database, json_data, now, to_datetime
from app.db_models import TranslatorProfile, User
from app.models.translator_profile import (
    TranslatorProfileComplete,
    TranslatorProfileDraft,
)
from app.repositories.translator_profile_store import translator_profile_record

router = APIRouter()


@router.get('/translators')
def list_translators(user: dict = Depends(staff)):
    """Lista somente tradutores ativos que podem receber uma tarefa."""
    with database() as session:
        sync_configured_accounts(session, configured_accounts())
        users = (
            session.execute(
                select(User.id, User.name, User.email, User.role, User.active, User.onboarding_required)
                .where(and_(User.role == 'translator', User.active.is_(True), User.onboarding_required.is_(False)))
                .order_by(func.lower(User.name))
            )
            .mappings()
            .all()
        )
    return [user_record(item) for item in users]


@router.get('/translator-profile/me')
def read_translator_profile(user: dict = Depends(translator_account)):
    """Perfil profissional e atividade do próprio tradutor autenticado."""
    with database() as session:
        current = session.execute(select(User.__table__).where(User.id == user['id'])).mappings().first()
        return translator_profile_record(session, dict(current))


@router.patch('/translator-profile/me')
def save_translator_profile_draft(data: TranslatorProfileDraft, user: dict = Depends(translator_account)):
    """Salva o formulário incompleto sem liberar o acesso ao portal."""
    with database() as session:
        current = (
            session.execute(select(User.__table__).where(User.id == user['id']).with_for_update()).mappings().first()
        )
        if not current['onboarding_required']:
            raise HTTPException(409, 'Seu cadastro já está concluído. Atualizações devem utilizar o perfil completo.')
        previous = (
            session.execute(select(TranslatorProfile.data).where(TranslatorProfile.user_id == user['id']))
            .mappings()
            .first()
        )
        merged = TranslatorProfileDraft.model_validate(
            {
                **(json_data(previous['data']) if previous else {'fullName': current['name']}),
                **data.model_dump(exclude_unset=True),
            }
        )
        statement = pg_insert(TranslatorProfile).values(
            user_id=user['id'],
            data=merged.model_dump(),
            updated_at=to_datetime(now()),
        )
        session.execute(
            statement.on_conflict_do_update(
                index_elements=[TranslatorProfile.user_id],
                set_={'data': statement.excluded.data, 'updated_at': statement.excluded.updated_at},
            )
        )
        return translator_profile_record(session, dict(current))


@router.get('/translator-profile/{translator_id}')
def read_team_translator_profile(translator_id: str, user: dict = Depends(authenticated_user)):
    """Consulta interna de perfis; a equipe não altera o cadastro do tradutor."""
    if user['role'] not in ('admin', 'employee', 'hr'):
        raise HTTPException(403, 'Somente a equipe pode consultar perfis de outros tradutores.')
    with database() as session:
        account = (
            session.execute(select(User.__table__).where(and_(User.id == translator_id, User.role == 'translator')))
            .mappings()
            .first()
        )
        if not account:
            raise HTTPException(404, 'Tradutor não encontrado.')
        return translator_profile_record(session, dict(account))


@router.put('/translator-profile/me')
def complete_translator_profile(data: TranslatorProfileComplete, user: dict = Depends(translator_account)):
    """Persiste o perfil e conclui o primeiro acesso na mesma transação."""
    with database() as session:
        current = (
            session.execute(select(User.__table__).where(User.id == user['id']).with_for_update()).mappings().first()
        )
        timestamp = to_datetime(now())
        statement = pg_insert(TranslatorProfile).values(
            user_id=user['id'],
            data=data.model_dump(),
            completed_at=timestamp,
            updated_at=timestamp,
        )
        session.execute(
            statement.on_conflict_do_update(
                index_elements=[TranslatorProfile.user_id],
                set_={
                    'data': statement.excluded.data,
                    'completed_at': func.coalesce(TranslatorProfile.completed_at, statement.excluded.completed_at),
                    'updated_at': statement.excluded.updated_at,
                },
            )
        )
        session.execute(update(User).values(name=data.fullName, onboarding_required=False).where(User.id == user['id']))
        return translator_profile_record(
            session, {**dict(current), 'name': data.fullName, 'onboarding_required': False}
        )
