import { requestGroups } from '@/features/requests/constants/status';
import { type RequestGroup, type RequestPage, type TranslationRequest } from '@/features/requests/types';

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
  result.targets = Array.isArray(request.targets) && request.targets.length ? request.targets.filter(target => typeof target === 'string') : [result.target];
  if (Array.isArray(request.tasks)) result.tasks = request.tasks.filter(task => task && typeof task.id === 'string');
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

export function normalizeRequestPage(page: RequestPage): RequestPage {
  if (!page || typeof page !== 'object' || typeof page.total !== 'number') {
    throw new Error('Não foi possível carregar a lista de solicitações. Tente novamente.');
  }
  const items = normalizeRequests(page.items);
  const groups = Object.fromEntries(Object.keys(requestGroups).map(group =>
    [group, Number(page.counts?.groups?.[group as RequestGroup]) || 0])) as Record<RequestGroup, number>;
  const statuses = page.counts?.statuses && typeof page.counts.statuses === 'object' ? page.counts.statuses : {};
  return { items, total: page.total, limit: Number(page.limit) || items.length, offset: Number(page.offset) || 0, counts: { groups, statuses } };
}
