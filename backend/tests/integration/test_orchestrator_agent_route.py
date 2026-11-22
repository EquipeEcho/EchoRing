"""Authenticated orchestrator route, using fake models and isolated database schemas."""

import os
from unittest.mock import patch

from app.agents.agent import root_agent
from app.agents.sub_agents.statistics import tools as statistics_tools
from app.services import orchestrator_agent, statistics_agent, workflow_agent
from tests.support.portal_test_case import PortalTestCase
from tests.unit.test_orchestrator_agent import FakeRouter, FakeToolModel, UnexpectedModel


@patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'})
class OrchestratorAgentRouteTests(PortalTestCase):
    def setUp(self):
        super().setUp()
        self.enterContext(patch.object(root_agent, 'model', FakeRouter()))
        for agent in root_agent.sub_agents:
            self.enterContext(patch.object(agent, 'model', UnexpectedModel()))

    def admin_headers(self):
        response = self.client.post('/auth/login', json={'email': 'admin@example.test', 'password': 'admin-password-long-enough'})
        return {'Authorization': 'Bearer ' + response.json()['token']}

    def test_authenticated_user_receives_direct_answer(self):
        response = self.client.post('/agent', json={'pergunta': 'Olá!'}, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Olá!', response.json()['resposta'])

    def test_route_trims_question_and_passes_authenticated_user(self):
        with patch.object(orchestrator_agent, 'responder', return_value='Resposta do assistente') as responder:
            response = self.client.post('/agent', json={'pergunta': '  Explique o TEP  '}, headers=self.headers)
        self.assertEqual(response.json(), {'resposta': 'Resposta do assistente'})
        responder.assert_called_once()
        question, user = responder.call_args.args
        self.assertEqual(question, 'Explique o TEP')
        self.assertEqual(user['email'], 'staff@example.test')
        self.assertEqual(user['role'], 'employee')
        self.assertTrue(user['id'])

    def test_unauthenticated_user_is_rejected_before_runner(self):
        with patch.object(orchestrator_agent, 'responder') as responder:
            response = self.client.post('/agent', json={'pergunta': 'Olá!'})
        self.assertEqual(response.status_code, 401)
        responder.assert_not_called()

    def test_translator_with_incomplete_onboarding_is_rejected(self):
        _, _, headers = self.invited_translator()
        with patch.object(orchestrator_agent, 'responder') as responder:
            response = self.client.post('/agent', json={'pergunta': 'Olá!'}, headers=headers)
        self.assertEqual(response.status_code, 403)
        responder.assert_not_called()

    def test_admin_can_delegate_statistics(self):
        with patch.object(root_agent, 'model', FakeRouter(destination='statistics_agent')), \
                patch.object(root_agent.sub_agents[0], 'model', FakeToolModel(tool_name='resumo_lucro')), \
                patch.object(statistics_tools, '_projects', return_value=[]) as projects:
            response = self.client.post('/agent', json={'pergunta': 'Qual o lucro?'}, headers=self.admin_headers())
        self.assertEqual(response.status_code, 200)
        self.assertIn('"status": "success"', response.json()['resposta'])
        projects.assert_called_once_with()

    def test_employee_cannot_query_statistics(self):
        with patch.object(root_agent, 'model', FakeRouter(destination='statistics_agent')), \
                patch.object(statistics_tools, '_projects') as projects:
            response = self.client.post('/agent', json={'pergunta': 'Qual o lucro?'}, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Somente administradores', response.json()['resposta'])
        projects.assert_not_called()

    def test_missing_key_and_unavailability_return_503(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            response = self.client.post('/agent', json={'pergunta': 'Olá!'}, headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertIn('não foi configurado', response.json()['detail'])

        with patch.object(orchestrator_agent, 'responder', side_effect=orchestrator_agent.AgentUnavailableError()):
            response = self.client.post('/agent', json={'pergunta': 'Olá!'}, headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertIn('indisponível', response.json()['detail'])

    def test_question_is_validated_before_runner(self):
        for body in ({}, {'pergunta': '  '}, {'pergunta': 'oi'}, {'pergunta': 'x' * 501}):
            with self.subTest(body=body), patch.object(orchestrator_agent, 'responder') as responder:
                response = self.client.post('/agent', json=body, headers=self.headers)
            self.assertEqual(response.status_code, 422)
            responder.assert_not_called()

    def test_legacy_agent_routes_keep_their_contracts(self):
        with patch.object(workflow_agent, 'responder', return_value='Fluxo TEP') as responder:
            response = self.client.post('/workflow/agent', json={'pergunta': '  Explique o TEP  '}, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'resposta': 'Fluxo TEP'})
        self.assertEqual(responder.call_args.args[0], 'Explique o TEP')
        self.assertEqual(responder.call_args.args[1]['role'], 'employee')

        with patch.object(statistics_agent, 'responder', return_value='Lucro em alta') as responder:
            response = self.client.post('/statistics/agent', json={'pergunta': '  Qual o lucro?  '}, headers=self.admin_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'resposta': 'Lucro em alta'})
        responder.assert_called_once_with('Qual o lucro?')
