"""Statistics ADK sub-agent: structure, tools and runner, with Gemini and the database mocked."""

import os
import unittest
from datetime import datetime
from decimal import Decimal
from typing import AsyncGenerator
from unittest.mock import patch

from google.adk.models import BaseLlm, LlmRequest, LlmResponse
from google.genai import types

from app.agents.sub_agents import statistics_agent
from app.agents.sub_agents.statistics import tools
from app.services import statistics_agent as service

PROJECTS = [{
    'createdAt': datetime(2026, 10, 1), 'quoted': True, 'approved': True,
    'revenue': Decimal('500'), 'cost': Decimal('200'), 'profit': Decimal('300'),
}]


USAGE = types.GenerateContentResponseUsageMetadata(prompt_token_count=1, candidates_token_count=1, total_token_count=2)


class FakeGemini(BaseLlm):
    """Gemini falso: pede a tool resumo_lucro e depois responde com o lucro que ela devolveu."""

    model: str = 'fake-gemini'

    async def generate_content_async(self, llm_request: LlmRequest, stream: bool = False) -> AsyncGenerator[LlmResponse, None]:
        last = llm_request.contents[-1].parts[0]
        if last.function_response:
            profit = last.function_response.response['profit']
            text = f'O lucro total foi R$ {profit:.2f}.'
            yield LlmResponse(content=types.Content(role='model', parts=[types.Part(text=text)]), usage_metadata=USAGE)
        else:
            call = types.FunctionCall(name='resumo_lucro', args={})
            yield LlmResponse(content=types.Content(role='model', parts=[types.Part(function_call=call)]), usage_metadata=USAGE)


class StatisticsAgentTests(unittest.TestCase):
    def test_agent_follows_adk_structure(self):
        """O sub-agente tem nome, prompts em Markdown e as quatro tools de estatística."""
        self.assertEqual(statistics_agent.name, 'statistics_agent')
        self.assertIn('estatística', statistics_agent.description)
        self.assertIn('nunca inventa valores', statistics_agent.instruction)
        self.assertEqual(
            [tool.__name__ for tool in statistics_agent.tools],
            ['resumo_lucro', 'tendencia_lucro', 'valor_esperado_orcamento', 'gastos_tradutores'],
        )

    def test_tools_return_calculated_values_with_status(self):
        """As tools devolvem os números calculados em Python com status de sucesso."""
        with patch.object(tools, '_projects', return_value=PROJECTS):
            self.assertEqual(tools.resumo_lucro()['profit'], 300.0)
            self.assertEqual(tools.tendencia_lucro()['direction'], 'estável')
            self.assertEqual(tools.valor_esperado_orcamento()['expected_value'], 500.0)
            self.assertEqual(tools.resumo_lucro()['status'], 'success')

    def test_tool_failure_returns_error_status(self):
        """Se o banco falhar, a tool devolve status de erro em vez de quebrar o agente."""
        with patch.object(tools, '_projects', side_effect=RuntimeError('banco fora')), self.assertLogs(tools.logger, 'ERROR'):
            result = tools.resumo_lucro()
        self.assertEqual(result['status'], 'error')

    def test_missing_api_key_raises_error(self):
        """Sem GEMINI_API_KEY o agente avisa que não está configurado."""
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            with self.assertRaises(service.AgentNotConfiguredError):
                service.responder('Qual o lucro?')

    def test_runner_calls_tool_and_returns_final_answer(self):
        """O ADK executa a tool pedida pelo modelo e devolve a resposta final em texto."""
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
                patch.object(statistics_agent, 'model', FakeGemini()), \
                patch.object(tools, '_projects', return_value=PROJECTS):
            answer = service.responder('Qual o lucro?')
        self.assertEqual(answer, 'O lucro total foi R$ 300.00.')

    def test_gemini_failure_becomes_unavailable_error(self):
        """Se o Gemini cair, o agente devolve um erro tratado."""
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
                patch.object(service, '_run', side_effect=TimeoutError()), \
                self.assertLogs(service.logger, 'ERROR'):
            with self.assertRaises(service.AgentUnavailableError):
                service.responder('Qual o lucro?')
