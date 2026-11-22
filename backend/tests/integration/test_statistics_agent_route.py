"""Statistics agent endpoint: access control and error handling, with Gemini mocked."""

import os
from unittest.mock import patch

from app.services import statistics_agent
from tests.support.portal_test_case import PortalTestCase


class StatisticsAgentRouteTests(PortalTestCase):
    def admin_headers(self):
        response = self.client.post('/auth/login', json={'email': 'admin@example.test', 'password': 'admin-password-long-enough'})
        return {'Authorization': 'Bearer ' + response.json()['token']}

    def test_admin_receives_agent_answer(self):
        """O administrador pergunta e recebe a resposta do agente."""
        with patch.object(statistics_agent, 'responder', return_value='O lucro está em alta.') as responder:
            response = self.client.post('/statistics/agent', json={'pergunta': '  Como está o lucro?  '}, headers=self.admin_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'resposta': 'O lucro está em alta.'})
        responder.assert_called_once_with('Como está o lucro?')

    def test_only_admin_can_use_agent(self):
        """Funcionário comum e visitante sem login não acessam o agente."""
        self.assertEqual(self.client.post('/statistics/agent', json={'pergunta': 'Lucro?'}, headers=self.headers).status_code, 403)
        self.assertEqual(self.client.post('/statistics/agent', json={'pergunta': 'Lucro?'}).status_code, 401)

    def test_agent_errors_return_503(self):
        """Sem chave ou com o Gemini fora do ar, a rota responde 503 com mensagem clara."""
        headers = self.admin_headers()
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            response = self.client.post('/statistics/agent', json={'pergunta': 'Lucro?'}, headers=headers)
        self.assertEqual(response.status_code, 503)
        self.assertIn('não foi configurado', response.json()['detail'])

        with patch.object(statistics_agent, 'responder', side_effect=statistics_agent.AgentUnavailableError()):
            response = self.client.post('/statistics/agent', json={'pergunta': 'Lucro?'}, headers=headers)
        self.assertEqual(response.status_code, 503)
        self.assertIn('indisponível', response.json()['detail'])

    def test_question_is_validated(self):
        """Pergunta vazia ou curta demais é recusada antes de chamar o Gemini."""
        response = self.client.post('/statistics/agent', json={'pergunta': '  '}, headers=self.admin_headers())
        self.assertEqual(response.status_code, 422)
