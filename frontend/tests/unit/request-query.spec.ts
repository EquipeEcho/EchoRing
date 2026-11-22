import { expect, test } from '@playwright/test';

import { normalizeRequestPage } from '../../src/features/requests/services/normalize-request';
import { type RequestPage, type TranslationRequest } from '../../src/features/requests/types';
import { queryRequests, statusesFor } from '../../src/features/requests/utils/request-query';

const request = (id: string, title: string, name: string, status: TranslationRequest['status'], day: number) => ({
  id, title, name, status, createdAt: `2026-11-0${day}T12:00:00Z`, email: 'cliente@example.test', company: '',
  service: 'Tradução', source: 'Inglês', target: 'Português', deadline: '', message: '', consent: true, attachments: [],
}) as TranslationRequest;

const records = [
  request('SOL-1', 'Manual técnico', 'Ana Souza', 'Recebido', 1),
  request('SOL-2', 'Contrato de serviços', 'Bruno Lima', 'Em andamento', 2),
  request('SOL-3', 'Relatório anual', 'Ana Martins', 'Entregue', 3),
];
const ids = (page: RequestPage) => page.items.map(item => item.id);

test('groups and exact statuses expand to the statuses they cover', () => {
  expect(statusesFor('pendente,Entregue')).toEqual(['Recebido', 'Entregue']);
  expect(statusesFor('')).toBeNull();
});

test('local listing filters, searches without accents and counts like the API', () => {
  const page = queryRequests(records, { search: 'ana' });
  expect(ids(page)).toEqual(['SOL-3', 'SOL-1']);
  expect(page.counts.groups).toEqual({ pendente: 1, orcamento: 0, traducao: 0, concluido: 1, cancelado: 0 });
  expect(ids(queryRequests(records, { status: 'traducao' }))).toEqual(['SOL-2']);
  expect(ids(queryRequests(records, { search: 'RELATORIO', status: 'concluido' }))).toEqual(['SOL-3']);
  expect(queryRequests(records, { search: 'ana', status: 'cancelado' }).total).toBe(0);
});

test('local listing pages with limit and offset and keeps the total', () => {
  const page = queryRequests(records, { limit: 2, offset: 2 });
  expect(ids(page)).toEqual(['SOL-1']);
  expect(page.total).toBe(3);
  expect(records.map(item => item.id)).toEqual(['SOL-1', 'SOL-2', 'SOL-3']);
});

test('page normalization fills missing counts and rejects other shapes', () => {
  const page = normalizeRequestPage({ items: records, total: 3 } as unknown as RequestPage);
  expect(page.counts.groups.pendente).toBe(0);
  expect(page.counts.statuses).toEqual({});
  expect(() => normalizeRequestPage(records as unknown as RequestPage)).toThrow('lista de solicitações');
});
