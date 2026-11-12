"""Client order tracking through personal read-only links."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update

from app.core.portal_auth import staff
from app.core.security import throttle
from app.database_pg import database, json_data
from app.db_models import TranslationRequest
from app.models.translation import QuoteAccess
from app.repositories.translation_store import add_event, read_request, sanitized_request
from app.services.email.tracking_service import send_tracking_link
from app.services.tracking import TRACKABLE_STATUSES, authorized_tracking, issue_tracking_token, public_tracking

router = APIRouter()


@router.post('/tracking/{request_id}')
def track_request(request_id: str, access: QuoteAccess, request: Request):
    """Mostra ao cliente o andamento do pedido aprovado, sem dados internos da equipe."""
    throttle(request, 'tracking', 40)
    with database() as session:
        stored = session.execute(
            select(TranslationRequest.data).where(TranslationRequest.id == request_id)
        ).scalar_one_or_none()
        data = authorized_tracking(json_data(stored) if stored is not None else None, access.token)
        return public_tracking(sanitized_request(data, session))


@router.post('/requests/{request_id}/send-tracking')
def send_tracking(request_id: str, user: dict = Depends(staff)):
    """Envia um link novo ao cliente; o anterior deixa de valer após o envio."""
    with database() as session:
        data, _ = read_request(session, request_id)
    if data['status'] not in TRACKABLE_STATUSES:
        raise HTTPException(409, 'O acompanhamento fica disponível depois que o cliente aprova o orçamento.')
    token = issue_tracking_token(data)
    send_tracking_link(data, token, resend=True)
    with database() as session:
        current, _ = read_request(session, request_id, for_update=True)
        current.update(trackingTokenDigest=data['trackingTokenDigest'], trackingSentAt=data['trackingSentAt'])
        session.execute(update(TranslationRequest).values(data=current).where(TranslationRequest.id == request_id))
        add_event(
            session,
            'Link de acompanhamento enviado',
            request_id=request_id,
            actor=user,
            note='Novo link enviado ao cliente; o anterior deixou de valer.',
            created_at=current['trackingSentAt'],
        )
        return sanitized_request(current, session, include_content=True)
