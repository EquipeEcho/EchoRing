"""PostgreSQL profile record and activity projection used by the portal."""
from app.core.portal_auth import public_user
from app.database_pg import json_data
from app.models.translator_profile import TranslatorProfileDraft

def translator_profile_record(connection, user):
    record = connection.execute('SELECT data, completed_at, updated_at FROM translator_profiles WHERE user_id = ?', (user['id'],)).fetchone()
    profile = TranslatorProfileDraft.model_validate(json_data(record['data']) if record else {'fullName': user['name']})
    activity = connection.execute('''SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('Tradutor atribuído', 'Em andamento', 'Revisão solicitada')) AS active,
        COUNT(*) FILTER (WHERE status = 'Aguardando avaliação') AS awaiting,
        COUNT(*) FILTER (WHERE status IN ('Pronta', 'Entregue')) AS completed
        FROM services WHERE translator_id = ?''', (user['id'],)).fetchone()
    return {
        'profile': profile.model_dump(), 'account': public_user(user),
        'completedAt': record['completed_at'].isoformat() if record and record['completed_at'] else None,
        'updatedAt': record['updated_at'].isoformat() if record else None,
        'activity': {'totalProjects': activity['total'], 'activeProjects': activity['active'],
                     'awaitingReview': activity['awaiting'], 'completedProjects': activity['completed']},
    }
