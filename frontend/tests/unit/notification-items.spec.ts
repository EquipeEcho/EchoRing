import { expect, test } from '@playwright/test';

import { notificationItems } from '../../src/features/workspace/utils/notification-items';

const base = { demo: false, received: 0, attention: 0, tasks: [], offers: [] };

test('staff notifications lead to the request list already filtered', () => {
  const items = notificationItems({ ...base, role: 'employee', received: 1, attention: 3 });
  expect(items.map(item => [item.title, item.href])).toEqual([
    ['3 solicitações precisam de atenção', { pathname: '/solicitacoes', params: { status: 'atencao' } }],
    ['1 solicitação aguardando análise', { pathname: '/solicitacoes', params: { status: 'pendente' } }],
  ]);
});

test('translators do not see request counts and tasks open their delivery', () => {
  const items = notificationItems({
    ...base, role: 'translator', received: 4, attention: 2,
    tasks: [
      { id: 1, title: 'Traduzir manual', project: 'Manual', due: 'Hoje', done: false, realTaskId: 'SRV-1' },
      { id: 2, title: 'Revisar glossário', project: 'Glossário', due: 'Amanhã', done: false },
      { id: 3, title: 'Concluída', project: 'Antiga', due: 'Ontem', done: true },
    ],
  });
  expect(items.map(item => item.href)).toEqual([{ pathname: '/entregas', params: { task: 'SRV-1' } }, '/tarefas']);
});

test('offer notifications keep their link and read state', () => {
  const items = notificationItems({
    ...base, role: 'translator',
    offers: [{ id: 7, message: 'Nova oportunidade de inglês', href: '/oportunidades/OF-7', createdAt: '2026-11-10T12:00:00Z', readAt: null }],
  });
  expect(items[0]).toMatchObject({ key: 'offer-7', offerId: 7, href: '/oportunidades/OF-7', unread: true });
});
