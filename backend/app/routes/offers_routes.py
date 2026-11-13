"""Real offers API integrated with the active portal authentication and tasks."""
from sqlalchemy import and_, func, insert, select, update
from app.db_models import JobOffer, JobOfferEvent, OfferNotification, Service, TranslationRequest, User
from app.database_pg import to_datetime

import base64
import secrets
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from app.core.portal_auth import staff, translator, workspace_user
from app.core.translation_scope import approved_request, resolve_target
from app.database_pg import database, json_data, now
from app.models.offer import OfferSend
from app.repositories.translation_store import add_event, read_request, read_service, update_request_status
from app.services.offers_service import (
    compatible, expire_request, notify, offer_record, read_offer,
    transition, translator_accounts,
)
from app.services.translation_workflows_service import assign_workflow

router = APIRouter()


@router.get('/requests/{request_id}/compatible-translators')
def compatible_translators(request_id: str, target: str | None = Query(default=None, max_length=160), user: dict = Depends(staff)):
    with database() as session:
        request, _ = read_request(session, request_id)
        request['target'] = resolve_target(request, target, approved=True)
        result = []
        for row in translator_accounts(session):
            if compatible(row, request):
                profile = json_data(row['profile']) if row.get('profile') else {}
                result.append({**{key: row[key] for key in ('id', 'name', 'email')},
                               'languages': profile.get('languages', [])})
        return result


@router.post('/requests/{request_id}/offers', status_code=201)
def send_offers(request_id: str, terms: OfferSend, user: dict = Depends(staff)):
    with database() as session:
        request, sending = read_request(session, request_id, for_update=True)
        expire_request(session, request_id)
        target = resolve_target(request, terms.target, approved=True)
        request['target'] = target
        if sending or not approved_request(request) or session.execute(select(1).select_from(Service).where(and_(Service.request_id == request_id, Service.target == target))).mappings().first():
            raise HTTPException(409, 'Somente orçamentos aprovados e sem tarefa podem receber ofertas.')
        accounts = translator_accounts(session)
        candidates = {row['id']: row for row in accounts if compatible(row, request)}
        if any(translator_id not in candidates for translator_id in terms.translatorIds):
            raise HTTPException(422, 'Selecione apenas tradutores ativos que tenham os idiomas de origem e destino cadastrados.')
        pending = session.execute(select(JobOffer.translator_id).where(and_(JobOffer.request_id == request_id, JobOffer.target == target, JobOffer.status == 'pending'))).mappings().all()
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
            offer = session.execute(insert(JobOffer).values(id=offer_id, request_id=request_id, translator_id=translator_id, created_by=user['id'], compensation=terms.compensation, deadline=terms.deadline, expires_at=to_datetime(terms.expiresAt), description=terms.description, requirements=terms.requirements, volume=terms.volume, audience=terms.audience, workflow_template_id=terms.workflowTemplateId, target=target).returning(JobOffer.__table__)).mappings().first()
            session.execute(insert(JobOfferEvent).values(offer_id=offer_id, status='pending', actor_id=user['id']))
            notify(session, offer, translator_id, f"Nova oportunidade: {request['title']}", '/oportunidades')
            result.append(offer_record(session, offer, request, staff=True))
        add_event(session, 'Ofertas enviadas', request_id=request_id, actor=user,
                           note=f'{target}: {len(result)} tradutor(es) convidado(s).')
        return result


@router.get('/requests/{request_id}/offers')
def request_offers(request_id: str, user: dict = Depends(staff)):
    with database() as session:
        request, _ = read_request(session, request_id, for_update=True)
        expire_request(session, request_id)
        rows = session.execute(select(JobOffer.__table__).where(JobOffer.request_id == request_id).order_by(JobOffer.created_at.desc(), JobOffer.id)).mappings().all()
        return [offer_record(session, row, request, staff=True) for row in rows]


@router.get('/opportunities')
def opportunities(status: Literal['pending', 'accepted', 'declined', 'expired', 'cancelled'] | None = None,
                  q: str = Query(default='', max_length=160), user: dict = Depends(translator)):
    with database() as session:
        request_ids = session.execute(select(JobOffer.request_id).distinct().where(JobOffer.translator_id == user['id']).order_by(JobOffer.request_id)).mappings().all()
        for item in request_ids:
            read_request(session, item['request_id'], for_update=True)
            expire_request(session, item['request_id'])
        rows = session.execute(
            select(JobOffer.__table__, TranslationRequest.data.label('request_data'))
            .join(TranslationRequest, TranslationRequest.id == JobOffer.request_id)
            .where(JobOffer.translator_id == user['id'])
            .order_by(JobOffer.created_at.desc(), JobOffer.id)
        ).mappings().all()
        result = []
        for row in rows:
            request = json_data(row['request_data'])
            searchable = ' '.join(str(value) for value in (request['title'], request['source'], row['target'],
                request['service'], row['id'], row['description'], row['volume'])).casefold()
            if (not status or row['status'] == status) and q.strip().casefold() in searchable:
                result.append(offer_record(session, row, request))
        return result


@router.get('/opportunities/{offer_id}')
def opportunity_detail(offer_id: str, user: dict = Depends(translator)):
    with database() as session:
        offer = read_offer(session, offer_id, user)
        request, _ = read_request(session, offer['request_id'], for_update=True)
        expire_request(session, request['id'])
        return offer_record(session, read_offer(session, offer_id, user), request)


def decide(offer_id, user, decision):
    conflict = None
    result = None
    with database() as session:
        offer = read_offer(session, offer_id, user)
        request, _ = read_request(session, offer['request_id'], for_update=True)
        expire_request(session, request['id'])
        offer = read_offer(session, offer_id, user)
        if offer['status'] != 'pending':
            conflict = 'Esta oferta não está mais pendente. Atualize a lista de oportunidades.'
        elif decision == 'accepted':
            target = resolve_target(request, offer['target'] or request['target'], approved=True)
            account = next((row for row in translator_accounts(session) if row['id'] == user['id']), None)
            if not account or not compatible(account, {**request, 'target': target}):
                raise HTTPException(422, 'Seu perfil precisa incluir os idiomas de origem e destino desta oferta.')
            if not approved_request(request) or session.execute(select(1).select_from(Service).where(and_(Service.request_id == request['id'], Service.target == target))).mappings().first():
                conflict = 'Este trabalho já foi atribuído ou não está mais disponível.'
            elif not session.execute(update(JobOffer).values(status='accepted').where(and_(JobOffer.id == offer_id, JobOffer.status == 'pending', JobOffer.expires_at > func.clock_timestamp())).returning(JobOffer.id)).mappings().first():
                transition(session, offer, 'expired', note='Prazo para resposta encerrado.')
                conflict = 'Esta oferta expirou. Atualize a lista de oportunidades.'
            else:
                service_id, created_at = 'TRD-' + secrets.token_hex(6).upper(), now()
                session.execute(insert(Service).values(id=service_id, request_id=request['id'], title=request['title'], translator_id=user['id'], status='Tradutor atribuído', deadline=offer['deadline'].isoformat(), observations='\n\n'.join(filter(None, [offer['description'], offer['requirements'], 'Volume: ' + offer['volume']])), source=request['source'], target=target, created_at=to_datetime(created_at), updated_at=to_datetime(created_at), translator_compensation=offer['compensation']))
                session.execute(update(JobOffer).values(service_id=service_id).where(JobOffer.id == offer_id))
                transition(session, offer, 'accepted', user, 'Trabalho atribuído ao primeiro aceite válido.')
                others = session.execute(select(JobOffer.__table__).where(and_(JobOffer.request_id == request['id'], JobOffer.target == target, JobOffer.status == 'pending', JobOffer.id != offer_id)).order_by(JobOffer.id)).mappings().all()
                for other in others:
                    transition(session, other, 'cancelled', user, 'Trabalho aceito por outro tradutor.')
                request = update_request_status(session, request['id'], 'Tradutor atribuído', user,
                                                'Oferta aceita pelo tradutor.', service_id, 'assignedAt')
                if offer['workflow_template_id']:
                    allocator = session.execute(select(User.id, User.name, User.role).where(User.id == offer['created_by'])).mappings().first()
                    assign_workflow(session, read_service(session, service_id), offer['workflow_template_id'], allocator)
        else:
            transition(session, offer, decision, user,
                       'Cancelada pela equipe.' if decision == 'cancelled' else 'Recusada pelo tradutor.')
        if not conflict:
            result = offer_record(session, read_offer(session, offer_id, user), request, user['role'] != 'translator')
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
    with database() as session:
        offer = read_offer(session, offer_id, user)
        request, _ = read_request(session, offer['request_id'], for_update=True)
        expire_request(session, request['id'])
        offer = read_offer(session, offer_id, user)
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
    with database() as session:
        return session.execute(select(OfferNotification.id, OfferNotification.message, OfferNotification.href, OfferNotification.created_at.label('createdAt'), OfferNotification.read_at.label('readAt')).where(OfferNotification.user_id == user['id']).order_by(OfferNotification.id.desc()).limit(100)).mappings().all()


@router.post('/offer-notifications/{notification_id}/read')
def read_notification(notification_id: int, user: dict = Depends(workspace_user)):
    with database() as session:
        row = session.execute(update(OfferNotification).values(read_at=func.coalesce(OfferNotification.read_at, func.current_timestamp())).where(and_(OfferNotification.id == notification_id, OfferNotification.user_id == user['id'])).returning(OfferNotification.id)).mappings().first()
        if not row:
            raise HTTPException(404, 'Notificação não encontrada.')
        return {'ok': True}
