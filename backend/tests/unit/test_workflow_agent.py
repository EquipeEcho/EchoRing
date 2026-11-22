"""Workflow ADK sub-agent: structure, tools and runner, with Gemini and the database mocked."""

import os
import unittest
from typing import AsyncGenerator
from unittest.mock import patch

from google.adk.models import BaseLlm, LlmRequest, LlmResponse
from google.genai import types

from app.agents.sub_agents import workflow_agent
from app.agents.sub_agents.workflow import tools
from app.services import workflow_agent as service

USAGE = types.GenerateContentResponseUsageMetadata(prompt_token_count=1, candidates_token_count=1, total_token_count=2)


class FakeGemini(BaseLlm):
    """Gemini falso: pede a tool explicar_fluxo_completo e depois responde com os dados retornados."""

    model: str = 'fake-gemini'

    async def generate_content_async(self, llm_request: LlmRequest, stream: bool = False) -> AsyncGenerator[LlmResponse, None]:
        last = llm_request.contents[-1].parts[0]
        if last.function_response:
            titulo = last.function_response.response['titulo']
            total = last.function_response.response['total_etapas']
            text = f'O fluxo {titulo} possui {total} etapas.'
            yield LlmResponse(content=types.Content(role='model', parts=[types.Part(text=text)]), usage_metadata=USAGE)
        else:
            call = types.FunctionCall(name='explicar_fluxo_completo', args={'template_id': 'tep'})
            yield LlmResponse(content=types.Content(role='model', parts=[types.Part(function_call=call)]), usage_metadata=USAGE)


class WorkflowAgentTests(unittest.TestCase):
    def test_agent_follows_adk_structure(self):
        """O sub-agente tem nome, prompts em Markdown e as sete tools de fluxo."""
        self.assertEqual(workflow_agent.name, 'workflow_agent')
        self.assertIn('fluxo de projetos', workflow_agent.description)
        self.assertIn('Nunca invente etapas', workflow_agent.instruction)
        self.assertEqual(
            [tool.__name__ for tool in workflow_agent.tools],
            [
                'listar_modelos_fluxo',
                'explicar_fluxo_completo',
                'explicar_etapa_fluxo',
                'listar_tarefas_fluxo',
                'consultar_fluxo_tarefa',
                'atribuir_fluxo_tarefa',
                'atualizar_etapa_fluxo',
            ],
        )

    def test_tools_explain_workflow_with_status(self):
        """As tools devolvem as definições do fluxo com status de sucesso ou erro."""
        modelos = tools.listar_modelos_fluxo()
        self.assertEqual(modelos['status'], 'success')
        self.assertGreaterEqual(len(modelos['modelos']), 1)

        primeiro_id = modelos['modelos'][0]['template_id']
        completo = tools.explicar_fluxo_completo(primeiro_id)
        self.assertEqual(completo['status'], 'success')
        self.assertEqual(completo['template_id'], primeiro_id)

        primeira_etapa = completo['etapas'][0]['id']
        etapa = tools.explicar_etapa_fluxo(primeiro_id, primeira_etapa)
        self.assertEqual(etapa['status'], 'success')
        self.assertEqual(etapa['etapa']['id'], primeira_etapa)

        inexistente = tools.explicar_fluxo_completo('modelo_inexistente')
        self.assertEqual(inexistente['status'], 'error')

    def test_tool_failure_returns_error_status(self):
        """Se o banco falhar, a tool devolve status de erro em vez de quebrar o agente."""
        token = tools.set_current_user({'id': 'admin-1', 'name': 'Admin', 'role': 'admin'})
        try:
            with patch.object(tools, 'database', side_effect=RuntimeError('banco fora')), self.assertLogs(tools.logger, 'ERROR'):
                result = tools.listar_tarefas_fluxo()
        finally:
            tools.reset_current_user(token)
        self.assertEqual(result['status'], 'error')

    def test_missing_api_key_raises_error(self):
        """Sem GEMINI_API_KEY o agente avisa que não está configurado."""
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            with self.assertRaises(service.AgentNotConfiguredError):
                service.responder('Explique o fluxo TEP')

    def test_runner_calls_tool_and_returns_final_answer(self):
        """O ADK executa a tool pedida pelo modelo e devolve a resposta final em texto."""
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
                patch.object(workflow_agent, 'model', FakeGemini()):
            answer = service.responder('Explique o fluxo TEP')
        self.assertIn('possui', answer)
        self.assertIn('etapas.', answer)

    def test_gemini_failure_becomes_unavailable_error(self):
        """Se o Gemini cair, o agente devolve um erro tratado."""
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
                patch.object(service, '_run', side_effect=TimeoutError()), \
                self.assertLogs(service.logger, 'ERROR'):
            with self.assertRaises(service.AgentUnavailableError):
                service.responder('Explique o fluxo TEP')


if __name__ == '__main__':
    unittest.main()