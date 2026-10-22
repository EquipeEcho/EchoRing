"""Single registration point for the portal's active HTTP routes."""

from fastapi import APIRouter

from app.routes.auth import router as auth_router
from app.routes.offers_routes import router as offers_router
from app.routes.requests_routes import router as requests_router
from app.routes.tasks_routes import router as tasks_router
from app.routes.translation_workflows_routes import router as workflows_router
from app.routes.translator_profiles_routes import router as profiles_router
from app.routes.users_routes import router as users_router

router = APIRouter()
for feature_router in (
    auth_router, users_router, profiles_router, requests_router,
    tasks_router, offers_router, workflows_router,
):
    router.include_router(feature_router)
