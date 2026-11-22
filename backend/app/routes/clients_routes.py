"""Staff-only client registration and project overview."""
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError
from app.core.portal_auth import staff
from app.database_pg import database, json_data
from app.models.client import ClientCreate
from app.repositories import client_store

router = APIRouter()


@router.get('/clients')
def list_clients(user: dict = Depends(staff)):
    clients = client_store.list_clients()
    with database() as connection:
        rows = connection.execute(
            '''SELECT requests.data, services.id AS service_id, services.status AS service_status
               FROM requests
               LEFT JOIN services ON services.request_id = requests.id
               ORDER BY requests.created_at DESC'''
        ).fetchall()

    projects_by_email = {}
    for row in rows:
        project = json_data(row['data'])
        email = project.get('email', '').strip().lower()
        if not email:
            continue
        projects_by_email.setdefault(email, []).append({
            'id': project['id'],
            'title': project['title'],
            'service': project['service'],
            'status': row['service_status'] or project['status'],
            'requestStatus': project['status'],
            'createdAt': project['createdAt'],
        })

    for client in clients:
        client['projects'] = projects_by_email.get(client['email'].lower(), [])
    return clients


@router.post('/clients', status_code=201)
def create_client(data: ClientCreate, user: dict = Depends(staff)):
    client_id = 'CLI-' + secrets.token_hex(6).upper()
    try:
        return client_store.create_client(client_id, data, user['id'], datetime.now(timezone.utc))
    except DuplicateKeyError as error:
        raise HTTPException(409, 'Já existe um cliente cadastrado com este e-mail.') from error
