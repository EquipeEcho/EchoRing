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

export type AIChatResult = { message: string };

export async function sendAIChatMessage(request: AIChatRequest, token: string): Promise<AIChatResult> {
  // O backend pode levar até 30 segundos para concluir a execução do agente.
  const result = await api<{ resposta: string }>('/agent', {
    method: 'POST',
    body: JSON.stringify({ pergunta: request.message.trim() }),
  }, token, 35000);
  if (typeof result?.resposta !== 'string' || !result.resposta.trim())
    throw new Error('O assistente retornou uma resposta vazia. Tente novamente.');
  return { message: result.resposta };
}
