import { type TranslationRequest } from '@/features/requests/types';

export function normalizeRequest(request: TranslationRequest): TranslationRequest {
  if (!request || typeof request.id !== 'string' || typeof request.status !== 'string') {
    throw new Error('Não foi possível carregar os dados da solicitação. Tente novamente.');
  }
  const result = { ...request };
  for (const key of ['name', 'email', 'company', 'title', 'service', 'source', 'target', 'deadline', 'message', 'createdAt'] as const) {
    result[key] = typeof request[key] === 'string' ? request[key] : '';
  }
  result.attachments = Array.isArray(request.attachments) ? request.attachments.filter(file =>
    file && typeof file.name === 'string') : [];
  result.history = Array.isArray(request.history) ? request.history.filter(event => event && typeof event === 'object') : [];
  if (request.quote) {
    result.quote = { ...request.quote,
      amount: typeof request.quote.amount === 'string' ? request.quote.amount : '',
      delivery: typeof request.quote.delivery === 'string' ? request.quote.delivery : '',
      message: typeof request.quote.message === 'string' ? request.quote.message : '',
    };
  }
  return result;
}

export function normalizeRequests(requests: TranslationRequest[]): TranslationRequest[] {
  if (!Array.isArray(requests)) throw new Error('Não foi possível carregar a lista de solicitações. Tente novamente.');
  return requests.map(normalizeRequest);
}
