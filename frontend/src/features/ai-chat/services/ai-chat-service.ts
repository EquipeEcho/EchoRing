import { api } from '@/lib/api/client';

import { api } from '@/lib/api/client';

export type AIChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

export type AIChatRequest = {
  message: string;
};

export type AIChatResult =
  | { status: 'unavailable' | 'error'; message: string }
  | { status: 'success'; message: string };

type OrchestratorResponse = {
  resposta: string;
};

export async function sendAIChatMessage(
  request: AIChatRequest,
  token?: string,
): Promise<AIChatResult> {
  if (!token) {
    return {
      status: 'unavailable',
      message: 'Entre com uma conta de administrador autenticada para usar o assistente.',
    };
  }

  try {
    const response = await api<OrchestratorResponse>('/agent', {
      method: 'POST',
      body: JSON.stringify({ pergunta: request.message }),
    }, token, 35000);
    if (typeof response?.resposta !== 'string' || !response.resposta.trim()) {
      throw new Error('O assistente retornou uma resposta inválida.');
    }
    return { status: 'success', message: response.resposta };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Não foi possível concluir a solicitação ao assistente.';
    const unavailable = /indisponível|conectar|configurado/i.test(message);
    return { status: unavailable ? 'unavailable' : 'error', message };
  }
}
