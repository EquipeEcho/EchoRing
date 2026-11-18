export type AIChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

export type AIChatRequest = {
  message: string;
  conversationId?: string;
};

export type AIChatResult =
  | { status: 'unavailable'; message: string }
  | { status: 'success'; message: string; conversationId?: string };

// Replace this implementation with the authenticated agent API when it exists.
export function sendAIChatMessage(_request: AIChatRequest): AIChatResult {
  return {
    status: 'unavailable',
    message: 'O assistente ainda não está conectado. Sua mensagem não foi enviada.',
  };
}
