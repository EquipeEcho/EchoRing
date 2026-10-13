import { apiMode } from '@/features/requests/constants/request-mode';
import { localRequests, saveLocal } from '@/features/requests/services/request-storage';
import {
  type Intake,
  type Quote,
  type TranslationRequest,
  type TranslatorOption,
} from '@/features/requests/types';
import { api } from '@/lib/api/client';

export async function submitIntake(data: Intake): Promise<TranslationRequest> {
  if (apiMode) return api('/requests', { method: 'POST', body: JSON.stringify(data) });
  const request: TranslationRequest = {
    ...data,
    id:
      'SOL-' +
      Date.now().toString(36).toUpperCase() +
      '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase(),
    createdAt: new Date().toISOString(),
    status: 'Recebido',
    demo: true,
  };
  saveLocal([request, ...localRequests()]);
  return request;
}

export async function getRequests(token?: string): Promise<TranslationRequest[]> {
  return token ? api('/requests', {}, token) : localRequests();
}

export async function getRequest(id: string, token?: string): Promise<TranslationRequest> {
  if (token) return api('/requests/' + encodeURIComponent(id), {}, token);
  const request = localRequests().find((item) => item.id === id);
  if (!request) throw new Error('Solicitação não encontrada.');
  return request;
}

export async function updateRequest(
  id: string,
  changes: { status?: 'Em análise' | 'Orçamento simulado'; quote?: Quote },
  token?: string,
): Promise<TranslationRequest> {
  if (token)
    return api(
      '/requests/' + encodeURIComponent(id),
      { method: 'PATCH', body: JSON.stringify(changes) },
      token,
    );
  const requests = localRequests();
  const request = requests.find((item) => item.id === id);
  if (!request) throw new Error('Solicitação não encontrada.');
  Object.assign(request, changes);
  if (changes.quote) request.status = 'Em análise';
  saveLocal(requests);
  return request;
}

export async function sendQuote(id: string, token: string): Promise<TranslationRequest> {
  return api('/requests/' + encodeURIComponent(id) + '/send-quote', { method: 'POST' }, token);
}

export function getTranslators(token: string) {
  return api<TranslatorOption[]>('/translators', {}, token);
}

export function assignTranslator(
  id: string,
  assignment: { translatorId: string; deadline: string; observations: string },
  token: string,
) {
  return api<{ id: string; status: string }>(
    `/requests/${encodeURIComponent(id)}/assign`,
    {
      method: 'POST',
      body: JSON.stringify(assignment),
    },
    token,
  );
}

export function submitQuoteDecision(
  quoteId: string,
  token: string,
  decision: 'approve' | 'decline',
) {
  return api<{
    requestId: string;
    quoteId: string;
    title: string;
    status: 'Orçamento aprovado' | 'Orçamento recusado';
    respondedAt: string;
  }>(`/quotes/${encodeURIComponent(quoteId)}/decision`, {
    method: 'POST',
    body: JSON.stringify({ token, decision }),
  });
}
