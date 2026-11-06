"""Rules for requests that need the team's attention.

Mirrored in `frontend/src/features/requests/utils/request-alerts.ts`; change both together.
"""

from datetime import timedelta

from sqlalchemy import Date, DateTime, and_, case, cast, func, or_, select

from app.db_models import Service, TranslationRequest

STALE_ANALYSIS_DAYS = 2
QUOTE_REMINDER_DAYS = 3
LINK_EXPIRY_WARNING_DAYS = 3
DEADLINE_WARNING_DAYS = 1
CLOSED_STATUSES = ('Pronta', 'Entregue', 'Orçamento recusado')
PRE_QUOTE_STATUSES = ('Recebido', 'Em análise')

ISO_DATE = '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
ISO_TIMESTAMP = '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'

STATUS = TranslationRequest.data['status'].astext


def _iso_date(expression):
    """Usa somente datas ISO; textos livres como "5 dias úteis" não geram alerta."""
    return case((expression.regexp_match(ISO_DATE), expression))


def _timestamp(expression):
    return case((expression.regexp_match(ISO_TIMESTAMP), cast(expression, DateTime(timezone=True))))


# Datas ISO são comparadas como texto, o que evita erros de conversão em valores inválidos.
_next_task_deadline = (
    select(func.min(Service.deadline))
    .where(
        Service.request_id == TranslationRequest.id,
        Service.status != 'Entregue',
        Service.deadline.regexp_match(ISO_DATE),
    )
    .correlate(TranslationRequest)
    .scalar_subquery()
)
NEXT_DEADLINE = func.coalesce(
    _next_task_deadline,
    case((STATUS.not_in(PRE_QUOTE_STATUSES), _iso_date(TranslationRequest.data[('quote', 'delivery')].astext))),
    case((STATUS.in_(PRE_QUOTE_STATUSES), _iso_date(TranslationRequest.data['deadline'].astext))),
)
_WARNING_LIMIT = func.to_char(
    cast(func.timezone('America/Sao_Paulo', func.now()), Date) + DEADLINE_WARNING_DAYS, 'YYYY-MM-DD'
)

NEEDS_ATTENTION = or_(
    and_(STATUS == 'Recebido', TranslationRequest.created_at <= func.now() - timedelta(days=STALE_ANALYSIS_DAYS)),
    and_(
        STATUS == 'Orçamento enviado',
        or_(
            _timestamp(TranslationRequest.data['emailSentAt'].astext)
            <= func.now() - timedelta(days=QUOTE_REMINDER_DAYS),
            _timestamp(TranslationRequest.data['quoteResponseExpiresAt'].astext)
            <= func.now() + timedelta(days=LINK_EXPIRY_WARNING_DAYS),
        ),
    ),
    and_(STATUS.not_in(CLOSED_STATUSES), NEXT_DEADLINE <= _WARNING_LIMIT),
)
