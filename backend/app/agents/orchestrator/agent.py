"""ADK entry point that delegates to the statistics and workflow specialists."""

from pathlib import Path

from google.adk import Agent
from google.adk.agents.callback_context import CallbackContext
from google.genai import types

from app.agents.config import MODEL
from app.agents.sub_agents import statistics_agent as _statistics_agent
from app.agents.sub_agents import workflow_agent as _workflow_agent
from app.agents.utils import load_prompt

_PROMPTS = Path(__file__).resolve().parent / 'prompts'


def _authorize_statistics(callback_context: CallbackContext) -> types.Content | None:
    """Bloqueia consultas financeiras antes de executar o especialista ou suas tools."""
    user = callback_context.state.get('user') or {}
    if user.get('role') != 'admin':
        return types.Content(
            role='model',
            parts=[types.Part(text='Somente administradores podem consultar as estatísticas e finanças da empresa.')],
        )
    return None


# O ADK atribui um pai aos sub-agentes. Cópias preservam os agentes das rotas antigas.
statistics_agent = _statistics_agent.clone(update={'before_agent_callback': _authorize_statistics})
workflow_agent = _workflow_agent.clone()

root_agent = Agent(
    name='orchestrator_agent',
    model=MODEL,
    description=load_prompt(_PROMPTS / 'description.md'),
    instruction=load_prompt(_PROMPTS / 'instruction.md'),
    sub_agents=[statistics_agent, workflow_agent],
)
