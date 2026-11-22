"""Administrator endpoint for the company statistics agent."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool

from app.core.portal_auth import administrator
from app.models.statistics import AgentQuestion
from app.services import statistics_agent

router = APIRouter()


@router.post('/statistics/agent')
async def ask_statistics_agent(data: AgentQuestion, admin: dict = Depends(administrator)):
    """Envia a pergunta do administrador ao agente e devolve a resposta em texto."""
    try:
        answer = await run_in_threadpool(statistics_agent.responder, data.pergunta)
    except statistics_agent.AgentNotConfiguredError as error:
        raise HTTPException(503, 'O agente de estatística não foi configurado.') from error
    except statistics_agent.AgentUnavailableError as error:
        raise HTTPException(503, 'O agente de estatística está indisponível. Tente novamente em instantes.') from error
    return {'resposta': answer}
