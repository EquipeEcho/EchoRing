"""Runs the ADK workflow sub-agent for the workspace endpoint."""

import asyncio
import logging
import os

from google.adk.runners import InMemoryRunner
from google.genai import types

from app.agents.sub_agents import workflow_agent
from app.agents.sub_agents.workflow.tools import reset_current_user, set_current_user

TIMEOUT_SECONDS = 30
APP_NAME = 'echoring'
logger = logging.getLogger(__name__)


class AgentNotConfiguredError(Exception):
    """GEMINI_API_KEY não configurada no .env."""


class AgentUnavailableError(Exception):
    """O Gemini não respondeu: fora do ar, sobrecarregado ou demorou demais."""


async def _run(pergunta: str, user: dict | None = None) -> str:
    token = set_current_user(user)
    try:
        runner = InMemoryRunner(agent=workflow_agent, app_name=APP_NAME)
        user_id = user['id'] if user and user.get('id') else 'workspace'
        session = await runner.session_service.create_session(app_name=APP_NAME, user_id=user_id)
        message = types.Content(role='user', parts=[types.Part(text=pergunta)])
        answer = ''
        async for event in runner.run_async(user_id=user_id, session_id=session.id, new_message=message):
            if event.is_final_response() and event.content and event.content.parts:
                answer = ''.join(part.text or '' for part in event.content.parts)
        return answer
    finally:
        reset_current_user(token)


def responder(pergunta: str, user: dict | None = None) -> str:
    """Recebe a pergunta ou comando do usuário e devolve a resposta do agente em texto."""
    if not os.getenv('GEMINI_API_KEY', ''):
        raise AgentNotConfiguredError('O agente de fluxo de projeto não foi configurado.')
    try:
        answer = asyncio.run(asyncio.wait_for(_run(pergunta, user), TIMEOUT_SECONDS))
    except Exception as error:
        logger.exception('Falha ao consultar o agente de fluxo de projeto')
        raise AgentUnavailableError('O agente de fluxo de projeto está indisponível no momento.') from error
    return answer or 'Não consegui gerar uma resposta agora.'