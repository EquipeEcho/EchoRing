"""Translation requests, quotes, assignments, reviews and final delivery (Facade)."""

import smtplib
from fastapi import APIRouter
from psycopg import sql

from app.core.email_service import deliver_quote
from app.core.portal_auth import (
    PASSWORD_ITERATIONS,
    SESSION_SECONDS,
    _attempts,
    administrator,
    authenticated_user,
    bearer,
    configured_accounts,
    hash_password,
    password_matches,
    public_user,
    staff,
    sync_configured_accounts,
    throttle,
    translator,
    translator_account,
    user_record,
    workspace_user,
)
from app.core.workflow import (
     add_event,
     delivery_record,
     ensure_task_access,
     event_history,
     original_attachment,
     read_delivery,
     read_request,
     read_service,
     sanitized_request,
     task_record,
     update_request_status,
)
from app.database_pg import (
     MAX_DELIVERY_BYTES,
     DatabaseConnection,
     database,
     environment_flag,
     initialize_schema,
     json_data,
     now,
     postgres_connection,
     postgres_schema,
)
from app.models.translation import (
     Attachment,
     DeliveryReview,
     Intake,
     Login,
     Quote,
     QuoteDecision,
     TranslatorAssignment,
     Update,
     UserCreate,
     validate_delivery_document,
)
from app.routes.requests_routes import router as requests_router
from app.routes.tasks_routes import router as tasks_router

router = APIRouter()
router.include_router(requests_router)
router.include_router(tasks_router)