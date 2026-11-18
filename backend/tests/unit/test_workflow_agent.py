"""Unit tests for the project workflow agent (without external Gemini API calls)."""

import os
import unittest
from unittest.mock import MagicMock, patch

from app.services import workflow_agent


class TestWorkflowAgent(unittest.TestCase):
    def test_listar_e_explicar_fluxo_completo_e_por_etapa(self):
        modelos = workflow_agent.listar_modelos_fluxo()
        self.assertTrue(len(modelos) >= 1)
        primeiro_id = modelos[0]['template_id']

        completo = workflow_agent.explicar_fluxo_completo(primeiro_id)
        self.assertTrue(completo['encontrado'])
        self.assertEqual(completo['template_id'], primeiro_id)
        self.assertGreater(len(completo['etapas']), 0)

        primeira_etapa_id = completo['etapas'][0]['id']
        detalhe_etapa = workflow_agent.explicar_etapa_fluxo(primeiro_id, primeira_etapa_id)
        self.assertTrue(detalhe_etapa['encontrado'])
        self.assertEqual(detalhe_etapa['etapa']['id'], primeira_etapa_id)

    def test_explicar_fluxo_inexistente_retorna_modelos_disponiveis(self):
        resultado = workflow_agent.explicar_fluxo_completo('modelo_inexistente')
        self.assertFalse(resultado['encontrado'])
        self.assertIn('modelos_disponiveis', resultado)

    def test_responder_sem_chave_levanta_erro_configuracao(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}, clear=False):
            with self.assertRaises(workflow_agent.AgentNotConfiguredError):
                workflow_agent.responder('Como funciona o fluxo TEP?')

    @patch('app.services.workflow_agent.genai.Client')
    def test_responder_com_gemini_falso_retorna_texto(self, mock_client_cls):
        fake_response = MagicMock()
        fake_response.text = 'O fluxo TEP possui etapas de tradução, edição e revisão.'
        mock_chat = MagicMock()
        mock_chat.send_message.return_value = fake_response
        mock_client_cls.return_value.chats.create.return_value = mock_chat

        with patch.dict(os.environ, {'GEMINI_API_KEY': 'fake-key'}, clear=False):
            resposta = workflow_agent.responder('Explique o fluxo TEP por inteiro')

        self.assertEqual(resposta, 'O fluxo TEP possui etapas de tradução, edição e revisão.')
        mock_chat.send_message.assert_called_once_with('Explique o fluxo TEP por inteiro')


if __name__ == '__main__':
    unittest.main()