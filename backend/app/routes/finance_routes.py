"""Administrator finance tab endpoint."""
from fastapi import APIRouter, Depends

from app.core.portal_auth import administrator
from app.database_pg import database
from app.repositories import finance_store
from app.services.finance_service import finance_overview

router = APIRouter()


@router.get('/finance/overview')
def get_finance_overview(admin: dict = Depends(administrator)):
    """Resumo financeiro da empresa para a aba Financeiro do administrador."""
    with database() as session:
        projects = finance_store.project_finances(session)
        translators = finance_store.translator_costs(session)
    return finance_overview(projects, translators)
