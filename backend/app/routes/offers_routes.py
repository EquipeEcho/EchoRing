"""Real offers API integrated with the active portal authentication and tasks."""

import base64
import secrets
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from psycopg.types.json import Jsonb

from app.core.portal_auth import staff, translator, workspace_user
from app.database_pg import database, json_data, now
from app.models.offer import OfferSend
from app.repositories.translation_store import add_event, read_request, read_service
from app.services.offers_service import (
    compatible, expire_request, notify, offer_record, read_offer,
    transition, translator_accounts,
)
from app.services.translation_workflows_service import assign_workflow

router = APIRouter()


@router.get('/requests/{request_id}/compatible-translators')
def compatible_translators(request_id: str, user: dict = Depends(staff)):
    with database() as connection:
        request, _ = read_request(connection, request_id)
        result = []
        for row in translator_accounts(connection):
            if compatible(row, request):
                profile = json_data(row['profile']) if row.get('profile') else {}
                result.append({**{key: row[key] for key in ('id', 'name', 'email')},
                               'languages': profile.get('languages', [])})
        return result


@router.post('/requests/{request_id}/offers', status_code=201)
def send_offers(request_id: str, terms: OfferSend, user: dict = Depends(staff)):
    with database() as connection:
        request, sending = read_request(connection, request_id, for_update=True)
        expire_request(connection, request_id)
        if sending or request['status'] != 'Orçamento aprovado' or connection.execute(
                'SELECT 1 FROM services WHERE request_id = ?', (request_id,)).fetchone():
            raise HTTPException(409, 'Somente orçamentos aprovados e sem tarefa podem receber ofertas.')
        accounts = translator_accounts(connection)
        candidates = {row['id']: row for row in accounts if compatible(row, request)}
        if any(translator_id not in candidates for translator_id in terms.translatorIds):
            raise HTTPException(422, 'Selecione apenas tradutores ativos que tenham os idiomas de origem e destino cadastrados.')
        pending = connection.execute("SELECT translator_id FROM job_offers WHERE request_id = ? AND status = 'pending'",
                                     (request_id,)).fetchall()
        pending_ids = {row['translator_id'] for row in pending}
        recipients = terms.translatorIds if terms.audience == 'selected' else [row['id'] for row in accounts
            if row['active'] and not row['onboarding_required'] and row['id'] not in pending_ids]
        if not recipients:
            raise HTTPException(409, 'Não há novos tradutores ativos disponíveis para esta publicação.')
        if any(row['translator_id'] in recipients for row in pending):
            raise HTTPException(409, 'Um dos tradutores já possui uma oferta pendente. Cancele-a antes de reenviar.')
        result = []
        for translator_id in recipients:
            offer_id = 'OFR-' + secrets.token_hex(12).upper()
            offer = connection.execute('''INSERT INTO job_offers
                (id, request_id, translator_id, created_by, compensation, deadline, expires_at,
                 description, requirements, volume, audience, workflow_template_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *''',
                (offer_id, request_id, translator_id, user['id'], terms.compensation, terms.deadline,
                 terms.expiresAt, terms.description, terms.requirements, terms.volume,
                 terms.audience, terms.workflowTemplateId)).fetchone()
            connection.execute('INSERT INTO job_offer_events (offer_id, status, actor_id) VALUES (?, ?, ?)',
                               (offer_id, 'pending', user['id']))
            notify(connection, offer, translator_id, f"Nova oportunidade: {request['title']}", '/oportunidades')
            result.append(offer_record(connection, offer, request, staff=True))
        add_event(connection, 'Ofertas enviadas', request_id=request_id, actor=user,
                           note=f'{len(result)} tradutor(es) convidado(s).')
        return result


@router.get('/requests/{request_id}/offers')
def request_offers(request_id: str, user: dict = Depends(staff)):
    with database() as connection:
        request, _ = read_request(connection, request_id, for_update=True)
        expire_request(connection, request_id)
        rows = connection.execute('SELECT * FROM job_offers WHERE request_id = ? ORDER BY created_at DESC, id',
                                  (request_id,)).fetchall()
        return [offer_record(connection, row, request, staff=True) for row in rows]


@router.get('/opportunities')
def opportunities(status: Literal['pending', 'accepted', 'declined', 'expired', 'cancelled'] | None = None,
                  q: str = Query(default='', max_length=160), user: dict = Depends(translator)):
    with database() as connection:
        request_ids = connection.execute('SELECT DISTINCT request_id FROM job_offers WHERE translator_id = ? ORDER BY request_id',
                                         (user['id'],)).fetchall()
        for item in request_ids:
            read_request(connection, item['request_id'], for_update=True)
            expire_request(connection, item['request_id'])
        rows = connection.execute('''SELECT job_offers.*, requests.data AS request_data FROM job_offers
            JOIN requests ON requests.id = job_offers.request_id WHERE translator_id = ?
            ORDER BY job_offers.created_at DESC, job_offers.id''', (user['id'],)).fetchall()
        result = []
        for row in rows:
            request = json_data(row['request_data'])
            searchable = ' '.join(str(value) for value in (request['title'], request['source'], request['target'],
                request['service'], row['id'], row['description'], row['volume'])).casefold()
            if (not status or row['status'] == status) and q.strip().casefold() in searchable:
                result.append(offer_record(connection, row, request))
        return result


@router.get('/opportunities/{offer_id}')
def opportunity_detail(offer_id: str, user: dict = Depends(translator)):
    with database() as connection:
        offer = read_offer(connection, offer_id, user)
        request, _ = read_request(connection, offer['request_id'], for_update=True)
        expire_request(connection, request['id'])
        return offer_record(connection, read_offer(connection, offer_id, user), request)


def decide(offer_id, user, decision):
    conflict = None
    result = None
    with database() as connection:
        offer = read_offer(connection, offer_id, user)
        request, _ = read_request(connection, offer['request_id'], for_update=True)
        expire_request(connection, request['id'])
        offer = read_offer(connection, offer_id, user)
        if offer['status'] != 'pending':
            conflict = 'Esta oferta não está mais pendente. Atualize a lista de oportunidades.'
        elif decision == 'accepted':
            account = next((row for row in translator_accounts(connection) if row['id'] == user['id']), None)
            if not account or not compatible(account, request):
                raise HTTPException(422, 'Seu perfil precisa incluir os idiomas de origem e destino desta oferta.')
            if request['status'] != 'Orçamento aprovado' or connection.execute(
                    'SELECT 1 FROM services WHERE request_id = ?', (request['id'],)).fetchone():
                conflict = 'Este trabalho já foi atribuído ou não está mais disponível.'
            elif not connection.execute(
                    "UPDATE job_offers SET status = 'accepted' WHERE id = ? AND status = 'pending' AND expires_at > clock_timestamp() RETURNING id",
                    (offer_id,)).fetchone():
                transition(connection, offer, 'expired', note='Prazo para resposta encerrado.')
                conflict = 'Esta oferta expirou. Atualize a lista de oportunidades.'
            else:
                service_id, created_at = 'TRD-' + secrets.token_hex(6).upper(), now()
                connection.execute('''INSERT INTO services (id, request_id, title, translator_id, status, deadline,
                    observations, source, target, created_at, updated_at, translator_compensation)
                    VALUES (?, ?, ?, ?, 'Tradutor atribuído', ?, ?, ?, ?, ?, ?, ?)''',
                    (service_id, request['id'], request['title'], user['id'], offer['deadline'].isoformat(),
                     '\n\n'.join(filter(None, [offer['description'], offer['requirements'], 'Volume: ' + offer['volume']])),
                     request['source'], request['target'], created_at, created_at, offer['compensation']))
                connection.execute('UPDATE job_offers SET service_id = ? WHERE id = ?', (service_id, offer_id))
                transition(connection, offer, 'accepted', user, 'Trabalho atribuído ao primeiro aceite válido.')
                others = connection.execute("SELECT * FROM job_offers WHERE request_id = ? AND status = 'pending' AND id <> ? ORDER BY id",
                                            (request['id'], offer_id)).fetchall()
                for other in others:
                    transition(connection, other, 'cancelled', user, 'Trabalho aceito por outro tradutor.')
                request.update(status='Tradutor atribuído', assignedAt=created_at, taskId=service_id,
                               translator={'id': user['id'], 'name': user['name'], 'email': user['email']})
                connection.execute('UPDATE requests SET data = ? WHERE id = ?', (Jsonb(request), request['id']))
                add_event(connection, 'Tradutor atribuído', request['id'], service_id, user,
                                   'Oferta aceita pelo tradutor.', created_at)
                if offer['workflow_template_id']:
                    allocator = connection.execute('SELECT id, name, role FROM users WHERE id = ?', (offer['created_by'],)).fetchone()
                    assign_workflow(connection, read_service(connection, service_id), offer['workflow_template_id'], allocator)
        else:
            transition(connection, offer, decision, user,
                       'Cancelada pela equipe.' if decision == 'cancelled' else 'Recusada pelo tradutor.')
        if not conflict:
            result = offer_record(connection, read_offer(connection, offer_id, user), request, user['role'] != 'translator')
    # Expiration must commit even if a stale accept/decline receives HTTP 409.
    if conflict:
        raise HTTPException(409, conflict)
    return result


@router.post('/opportunities/{offer_id}/accept')
def accept_opportunity(offer_id: str, user: dict = Depends(translator)):
    return decide(offer_id, user, 'accepted')


@router.post('/opportunities/{offer_id}/decline')
def decline_opportunity(offer_id: str, user: dict = Depends(translator)):
    return decide(offer_id, user, 'declined')


@router.post('/offers/{offer_id}/cancel')
def cancel_offer(offer_id: str, user: dict = Depends(staff)):
    return decide(offer_id, user, 'cancelled')


@router.get('/opportunities/{offer_id}/attachments/{index}')
def opportunity_document(offer_id: str, index: int, user: dict = Depends(translator)):
    forbidden = False
    attachment = None
    with database() as connection:
        offer = read_offer(connection, offer_id, user)
        request, _ = read_request(connection, offer['request_id'], for_update=True)
        expire_request(connection, request['id'])
        offer = read_offer(connection, offer_id, user)
        forbidden = offer['status'] not in ('pending', 'accepted')
        if not forbidden:
            files = request.get('attachments', [])
            if index < 0 or index >= len(files):
                raise HTTPException(404, 'Documento não encontrado.')
            attachment = files[index]
    if forbidden:
        raise HTTPException(403, 'Os documentos estão disponíveis apenas para ofertas pendentes ou aceitas.')
    return Response(base64.b64decode(attachment['content'], validate=True), media_type='application/octet-stream',
                    headers={'Content-Disposition': "attachment; filename*=UTF-8''" + quote(attachment['name'], safe=''),
                             'X-Content-Type-Options': 'nosniff'})


@router.get('/offer-notifications')
def notifications(user: dict = Depends(workspace_user)):
    if user['role'] not in ('admin', 'employee', 'translator'):
        raise HTTPException(403, 'Sua conta não tem acesso às ofertas.')
    with database() as connection:
        return connection.execute('''SELECT id, message, href, created_at AS "createdAt", read_at AS "readAt"
            FROM offer_notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100''', (user['id'],)).fetchall()


@router.post('/offer-notifications/{notification_id}/read')
def read_notification(notification_id: int, user: dict = Depends(workspace_user)):
    with database() as connection:
        row = connection.execute('''UPDATE offer_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
            WHERE id = ? AND user_id = ? RETURNING id''', (notification_id, user['id'])).fetchone()
        if not row:
            raise HTTPException(404, 'Notificação não encontrada.')
        return {'ok': True}
