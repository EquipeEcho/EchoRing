"""ADK sub-agent specialized in project workflows and stage transitions."""

from pathlib import Path

from google.adk import Agent

from ...config import MODEL
from ...utils import load_prompt
from .tools import (
    atribuir_fluxo_tarefa,
    atualizar_etapa_fluxo,
    consultar_fluxo_tarefa,
    explicar_etapa_fluxo,
    explicar_fluxo_completo,
    listar_modelos_fluxo,
    listar_tarefas_fluxo,
)

_PROMPTS = Path(__file__).resolve().parent / 'prompts'

workflow_agent = Agent(
    name='workflow_agent',
    model=MODEL,
    description=load_prompt(_PROMPTS / 'description.md'),
    instruction=load_prompt(_PROMPTS / 'instruction.md'),
    tools=[
        listar_modelos_fluxo,
        explicar_fluxo_completo,
        explicar_etapa_fluxo,
        listar_tarefas_fluxo,
        consultar_fluxo_tarefa,
        atribuir_fluxo_tarefa,
        atualizar_etapa_fluxo,
    ],
)