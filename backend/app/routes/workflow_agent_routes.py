"""Authenticated endpoint for the project workflow agent."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool

from app.core.portal_auth import workspace_user
from app.models.workflow_agent import WorkflowAgentQuestion
from app.services import workflow_agent

router = APIRouter()


@router.post('/workflow/agent')
async def ask_workflow_agent(data: WorkflowAgentQuestion, user: dict = Depends(workspace_user)):
    """Envia a pergunta ou comando ao agente de fluxo de projeto e devolve a resposta em texto."""
    try:
        answer = await run_in_threadpool(workflow_agent.responder, data.pergunta, user)
    except workflow_agent.AgentNotConfiguredError as error:
        raise HTTPException(503, 'O agente de fluxo de projeto não foi configurado.') from error
    except workflow_agent.AgentUnavailableError as error:
        raise HTTPException(503, 'O agente de fluxo de projeto está indisponível. Tente novamente em instantes.') from error
    return {'resposta': answer}