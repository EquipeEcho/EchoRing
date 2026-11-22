"""Translator listing, onboarding and owner/team profile endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from app.core.portal_auth import authenticated_user, configured_accounts, staff, sync_configured_accounts, translator_account, user_record
from app.database_pg import database, json_data, now
from app.models.translator_profile import TranslatorProfileComplete, TranslatorProfileDraft
from app.repositories.translator_profile_store import translator_profile_record

router = APIRouter()


@router.get('/translators')
def list_translators(user: dict = Depends(staff)):
    """Lista somente tradutores ativos que podem receber uma tarefa."""
    with database() as connection:
        sync_configured_accounts(connection, configured_accounts())
        users = connection.execute(
            "SELECT id, name, email, role, active, onboarding_required FROM users WHERE role = 'translator' AND active = TRUE AND onboarding_required = FALSE ORDER BY LOWER(name)"
        ).fetchall()
    return [user_record(item) for item in users]


@router.get('/translator-profile/me')
def read_translator_profile(user: dict = Depends(translator_account)):
    """Perfil profissional e atividade do próprio tradutor autenticado."""
    with database() as connection:
        current = connection.execute('SELECT * FROM users WHERE id = ?', (user['id'],)).fetchone()
        return translator_profile_record(connection, dict(current))


@router.patch('/translator-profile/me')
def save_translator_profile_draft(data: TranslatorProfileDraft, user: dict = Depends(translator_account)):
    """Salva o formulário incompleto sem liberar o acesso ao portal."""
    with database() as connection:
        current = connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', (user['id'],)).fetchone()
        if not current['onboarding_required']:
            raise HTTPException(409, 'Seu cadastro já está concluído. Atualizações devem utilizar o perfil completo.')
        previous = connection.execute('SELECT data FROM translator_profiles WHERE user_id = ?', (user['id'],)).fetchone()
        merged = TranslatorProfileDraft.model_validate({
            **(json_data(previous['data']) if previous else {'fullName': current['name']}),
            **data.model_dump(exclude_unset=True),
        })
        connection.execute(
            '''INSERT INTO translator_profiles (user_id, data, updated_at) VALUES (?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at''',
            (user['id'], Jsonb(merged.model_dump()), now()),
        )
        return translator_profile_record(connection, dict(current))


@router.get('/translator-profile/{translator_id}')
def read_team_translator_profile(translator_id: str, user: dict = Depends(authenticated_user)):
    """Consulta interna de perfis; a equipe não altera o cadastro do tradutor."""
    if user['role'] not in ('admin', 'employee', 'hr'):
        raise HTTPException(403, 'Somente a equipe pode consultar perfis de outros tradutores.')
    with database() as connection:
        account = connection.execute("SELECT * FROM users WHERE id = ? AND role = 'translator'", (translator_id,)).fetchone()
        if not account:
            raise HTTPException(404, 'Tradutor não encontrado.')
        return translator_profile_record(connection, dict(account))


@router.put('/translator-profile/me')
def complete_translator_profile(data: TranslatorProfileComplete, user: dict = Depends(translator_account)):
    """Persiste o perfil e conclui o primeiro acesso na mesma transação."""
    with database() as connection:
        current = connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', (user['id'],)).fetchone()
        timestamp = now()
        connection.execute(
            '''INSERT INTO translator_profiles (user_id, data, completed_at, updated_at) VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET data = excluded.data,
               completed_at = COALESCE(translator_profiles.completed_at, excluded.completed_at),
               updated_at = excluded.updated_at''',
            (user['id'], Jsonb(data.model_dump()), timestamp, timestamp),
        )
        connection.execute('UPDATE users SET name = ?, onboarding_required = FALSE WHERE id = ?', (data.fullName, user['id']))
        return translator_profile_record(connection, {**dict(current), 'name': data.fullName, 'onboarding_required': False})
