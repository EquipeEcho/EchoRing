"""Leitura e gravação do perfil do tradutor no MongoDB."""

from app.mongo import get_db


def _collection():
    return get_db()['translator_profiles']


def find_profile(user_id):
    """Devolve o documento do perfil ou None se o tradutor ainda não salvou nada."""
    return _collection().find_one({'_id': user_id})


def save_draft(user_id, data, timestamp):
    """Cria ou atualiza o rascunho sem marcar o cadastro como concluído."""
    _collection().update_one(
        {'_id': user_id},
        {'$set': {'data': data, 'updated_at': timestamp}},
        upsert=True,
    )


def save_complete(user_id, data, timestamp):
    """Salva o perfil completo; a data de conclusão é gravada só na primeira vez."""
    _collection().update_one(
        {'_id': user_id},
        {'$set': {'data': data, 'updated_at': timestamp}},
        upsert=True,
    )
    _collection().update_one(
        {'_id': user_id, 'completed_at': None},
        {'$set': {'completed_at': timestamp}},
    )
