"""PostgreSQL profile record and activity projection used by the portal."""
from sqlalchemy import func, select
from app.db_models import Service, TranslatorProfile
from app.core.portal_auth import public_user
from app.database_pg import json_data
from app.models.translator_profile import TranslatorProfileDraft

def translator_profile_record(session, user):
    record = session.execute(select(TranslatorProfile.data, TranslatorProfile.completed_at, TranslatorProfile.updated_at).where(TranslatorProfile.user_id == user['id'])).mappings().first()
    profile = TranslatorProfileDraft.model_validate(json_data(record['data']) if record else {'fullName': user['name']})
    activity = session.execute(
        select(
            func.count().label('total'),
            func.count().filter(Service.status.in_(['Tradutor atribuído', 'Em andamento', 'Revisão solicitada'])).label('active'),
            func.count().filter(Service.status == 'Aguardando avaliação').label('awaiting'),
            func.count().filter(Service.status.in_(['Pronta', 'Entregue'])).label('completed'),
        ).where(Service.translator_id == user['id'])
    ).mappings().first()
    return {
        'profile': profile.model_dump(), 'account': public_user(user),
        'completedAt': record['completed_at'].isoformat() if record and record['completed_at'] else None,
        'updatedAt': record['updated_at'].isoformat() if record else None,
        'activity': {'totalProjects': activity['total'], 'activeProjects': activity['active'],
                     'awaitingReview': activity['awaiting'], 'completedProjects': activity['completed']},
    }
