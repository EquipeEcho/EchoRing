"""Authenticated entry point for the company assistant."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool

from app.core.portal_auth import workspace_user
from app.models.orchestrator_agent import OrchestratorAgentQuestion
from app.services import orchestrator_agent

router = APIRouter()


@router.post('/agent')
async def ask_orchestrator_agent(data: OrchestratorAgentQuestion, user: dict = Depends(workspace_user)):
    """Envia a pergunta ao orquestrador preservando a identidade autenticada."""
    try:
        answer = await run_in_threadpool(orchestrator_agent.responder, data.pergunta, user)
    except orchestrator_agent.AgentNotConfiguredError as error:
        raise HTTPException(503, 'O assistente não foi configurado.') from error
    except orchestrator_agent.AgentUnavailableError as error:
        raise HTTPException(503, 'O assistente está indisponível. Tente novamente em instantes.') from error
    return {'resposta': answer}
