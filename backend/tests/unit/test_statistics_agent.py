"""Statistics agent wiring, with Gemini and the database mocked."""

import os
import unittest
from datetime import datetime
from decimal import Decimal
from unittest.mock import ANY, MagicMock, patch

from app.services import statistics_agent as agent

PROJECTS = [{
    'createdAt': datetime(2026, 10, 1), 'quoted': True, 'approved': True,
    'revenue': Decimal('500'), 'cost': Decimal('200'), 'profit': Decimal('300'),
}]


class StatisticsAgentTests(unittest.TestCase):
    def test_missing_api_key_raises_error(self):
        """Sem GEMINI_API_KEY o agente avisa que não está configurado."""
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            with self.assertRaises(agent.AgentNotConfiguredError):
                agent.responder('Qual o lucro?')

    def test_tools_return_calculated_values(self):
        """As ferramentas entregam ao Gemini os números calculados em Python."""
        with patch.object(agent, '_projects', return_value=PROJECTS):
            self.assertEqual(agent.resumo_lucro()['profit'], 300.0)
            self.assertEqual(agent.tendencia_lucro()['direction'], 'estável')
            self.assertEqual(agent.valor_esperado_orcamento()['expected_value'], 500.0)

    def test_responder_sends_question_with_tools(self):
        """A pergunta vai para o Gemini junto com as instruções e as ferramentas."""
        client = MagicMock()
        client.chats.create.return_value.send_message.return_value.text = 'O lucro foi R$ 300,00.'
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
                patch.object(agent.genai, 'Client', return_value=client) as factory:
            answer = agent.responder('Qual o lucro?')

        self.assertEqual(answer, 'O lucro foi R$ 300,00.')
        factory.assert_called_once_with(api_key='test-key', http_options=ANY)
        config = client.chats.create.call_args.kwargs['config']
        self.assertEqual(config.tools, agent.TOOLS)
        self.assertIn('nunca invente', config.system_instruction)
        client.chats.create.return_value.send_message.assert_called_once_with('Qual o lucro?')

    def test_gemini_failure_becomes_unavailable_error(self):
        """Se o Gemini cair ou demorar demais, o agente devolve um erro tratado."""
        client = MagicMock()
        client.chats.create.return_value.send_message.side_effect = TimeoutError()
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
                patch.object(agent.genai, 'Client', return_value=client), \
                self.assertLogs(agent.logger, 'ERROR'):
            with self.assertRaises(agent.AgentUnavailableError):
                agent.responder('Qual o lucro?')
