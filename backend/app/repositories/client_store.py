"""Persistence for client contact records in MongoDB."""

from datetime import datetime, timezone
import secrets

from pymongo.errors import DuplicateKeyError
from app.mongo import get_db


def _collection():
    collection = get_db()['clients']
    collection.create_index('email', unique=True, name='clients_email_unique')
    return collection


def client_record(client):
    created_at = client['created_at']
    if isinstance(created_at, datetime):
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        created_at = created_at.astimezone(timezone.utc).isoformat()
    return {
        'id': client['_id'],
        'name': client['name'],
        'email': client['email'],
        'company': client['company'],
        'createdAt': created_at,
        'projects': [],
    }


def list_clients():
    clients = _collection().find().sort('created_at', -1)
    return [client_record(client) for client in clients]


def create_client(client_id, data, created_by, created_at):
    collection = _collection()
    document = {
        '_id': client_id,
        'name': data.name,
        'email': data.email,
        'company': data.company,
        'created_by': created_by,
        'created_at': created_at,
    }
    collection.insert_one(document)
    return client_record(collection.find_one({'_id': client_id}))


def upsert_quote_client(data, created_at):
    collection = _collection()
    try:
        collection.update_one(
            {'email': data.email},
            {
                '$set': {'name': data.name, 'company': data.company},
                '$setOnInsert': {
                    '_id': 'CLI-' + secrets.token_hex(6).upper(),
                    'email': data.email,
                    'created_by': 'landing-page',
                    'created_at': created_at,
                },
            },
            upsert=True,
        )
    except DuplicateKeyError:
        collection.update_one(
            {'email': data.email},
            {'$set': {'name': data.name, 'company': data.company}},
        )
    return client_record(collection.find_one({'email': data.email}))
