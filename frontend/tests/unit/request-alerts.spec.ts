import { expect, test } from '@playwright/test';

import { type TranslationRequest } from '../../src/features/requests/types';
import { nextDeadline, requestAlerts, saoPauloToday } from '../../src/features/requests/utils/request-alerts';
import { queryRequests } from '../../src/features/requests/utils/request-query';

// 5 Nov 2026, 15:00 in São Paulo.
const now = Date.parse('2026-11-05T18:00:00Z');
const day = 86400000;
const iso = (days: number) => new Date(now + days * day).toISOString();
const request = (changes: Partial<TranslationRequest>) => ({
  id: 'SOL-1', title: 'Manual', name: 'Ana', email: 'ana@example.test', company: '', service: 'Tradução',
  source: 'Inglês', target: 'Português', deadline: '', message: '', consent: true, attachments: [],
  createdAt: iso(0), status: 'Recebido', ...changes,
}) as TranslationRequest;
const labels = (value: TranslationRequest) => requestAlerts(value, now).map(alert => `${alert.tone}: ${alert.label}`);

test('requests waiting for analysis are flagged after two days', () => {
  expect(labels(request({ createdAt: iso(-1) }))).toEqual([]);
  expect(labels(request({ createdAt: iso(-2) }))).toEqual(['amber: Aguardando análise há 2 dias']);
});

test('sent quotes warn about missing answers and expiring or expired links', () => {
  const sent = { status: 'Orçamento enviado' as const, quote: { amount: '100', delivery: '2026-12-01', message: '' } };
  expect(labels(request({ ...sent, emailSentAt: iso(-1), quoteExpiresAt: iso(20) }))).toEqual([]);
  expect(labels(request({ ...sent, emailSentAt: iso(-3), quoteExpiresAt: iso(1.5) })))
    .toEqual(['amber: Sem resposta há 3 dias', 'amber: Link expira em 2 dias']);
  expect(labels(request({ ...sent, emailSentAt: iso(-31), quoteExpiresAt: iso(-1) })))
    .toEqual(['amber: Sem resposta há 31 dias', 'red: Link do orçamento expirou']);
});

test('deadlines use São Paulo days and the most urgent open date', () => {
  expect(saoPauloToday(now)).toBe('2026-11-05');
  expect(saoPauloToday(Date.parse('2026-11-06T02:00:00Z'))).toBe('2026-11-05');
  const translating = request({
    status: 'Em andamento', quote: { amount: '100', delivery: '2026-11-20', message: '' },
    tasks: [
      { id: 'A', status: 'Entregue', deadline: '2026-11-01', translator: { id: '1', name: 'A', email: '' } },
      { id: 'B', status: 'Em andamento', deadline: '2026-11-06', translator: { id: '2', name: 'B', email: '' } },
    ],
  });
  expect(nextDeadline(translating)).toBe('2026-11-06');
  expect(labels(translating)).toEqual(['amber: Prazo vence amanhã']);
  expect(labels(request({ status: 'Em análise', deadline: '2026-11-05' }))).toEqual(['amber: Prazo vence hoje']);
  expect(labels(request({ status: 'Orçamento aprovado', quote: { amount: '1', delivery: '2026-11-03', message: '' } })))
    .toEqual(['red: Atrasado há 2 dias']);
});

test('free-text dates and finished requests never raise alerts', () => {
  expect(labels(request({ status: 'Em análise', deadline: '5 dias úteis' }))).toEqual([]);
  expect(labels(request({ status: 'Entregue', quote: { amount: '1', delivery: '2026-10-01', message: '' } }))).toEqual([]);
  expect(labels(request({ status: 'Orçamento recusado', deadline: '2026-10-01' }))).toEqual([]);
});

test('the local listing filters and counts requests that need attention', () => {
  const records = [request({ id: 'SOL-NOVO' }), request({ id: 'SOL-PARADO', createdAt: iso(-3) })];
  const page = queryRequests(records, { attention: true }, now);
  expect(page.items.map(item => item.id)).toEqual(['SOL-PARADO']);
  expect(page.counts.attention).toBe(1);
});
