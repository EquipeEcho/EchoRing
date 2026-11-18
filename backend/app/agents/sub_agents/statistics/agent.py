"""ADK sub-agent specialized in company statistics and finances."""

from pathlib import Path

from google.adk import Agent

from ...config import MODEL
from ...utils import load_prompt
from .tools import gastos_tradutores, resumo_lucro, tendencia_lucro, valor_esperado_orcamento

_PROMPTS = Path(__file__).resolve().parent / 'prompts'

statistics_agent = Agent(
    name='statistics_agent',
    model=MODEL,
    description=load_prompt(_PROMPTS / 'description.md'),
    instruction=load_prompt(_PROMPTS / 'instruction.md'),
    tools=[resumo_lucro, tendencia_lucro, valor_esperado_orcamento, gastos_tradutores],
)
