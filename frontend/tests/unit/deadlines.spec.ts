import { expect, test } from '@playwright/test';

import { type TranslationService } from '../../src/features/deliveries/types';
import { byTaskUrgency, taskDeadline, taskDeadlineAlert } from '../../src/features/deliveries/utils/task-deadlines';
import { type Offer } from '../../src/features/offers/types';
import { byResponseUrgency, offerDeadlineAlerts } from '../../src/features/offers/utils/offer-deadlines';
import { byNearestDeadline, deadlineAlert, responseAlert } from '../../src/utils/deadlines';

// 12 Nov 2026, 15:00 in São Paulo.
const now = Date.parse('2026-11-12T18:00:00Z');
const hour = 3600000;

test('date-only deadlines warn on the São Paulo calendar day', () => {
  expect(deadlineAlert('2026-11-10', now)).toEqual({ tone: 'red', label: 'Atrasado há 2 dias' });
  expect(deadlineAlert('2026-11-12', now)).toEqual({ tone: 'amber', label: 'Prazo vence hoje' });
  expect(deadlineAlert('2026-11-13', now)).toEqual({ tone: 'amber', label: 'Prazo vence amanhã' });
  expect(deadlineAlert('2026-11-14', now)).toBeNull();
  expect(deadlineAlert('2026-11-14', now, 2)).toEqual({ tone: 'amber', label: 'Prazo vence em 2 dias' });
  expect(deadlineAlert('5 dias úteis', now)).toBeNull();
  expect(deadlineAlert('2026-11-12', Date.parse('2026-11-13T02:30:00Z'))).toEqual({ tone: 'amber', label: 'Prazo vence hoje' });
});

test('answer windows count hours and turn red close to the end', () => {
  expect(responseAlert(new Date(now + 30 * hour).toISOString(), now)).toBeNull();
  expect(responseAlert(new Date(now + 5.2 * hour).toISOString(), now)).toEqual({ tone: 'amber', label: 'Responda em até 6 h' });
  expect(responseAlert(new Date(now + 2 * hour).toISOString(), now)).toEqual({ tone: 'red', label: 'Responda em até 2 h' });
  expect(responseAlert(new Date(now - hour).toISOString(), now)).toEqual({ tone: 'red', label: 'Prazo de resposta encerrado' });
});

test('items with dates come first in deadline order and undated ones keep their order', () => {
  const items = [{ id: 'a', due: '' }, { id: 'b', due: '2026-11-20' }, { id: 'c' }, { id: 'd', due: '2026-11-13' }];
  expect(items.sort(byNearestDeadline<{ id: string; due?: string }>(item => item.due)).map(item => item.id)).toEqual(['d', 'b', 'a', 'c']);
});

const task = (changes: Partial<TranslationService>) => ({
  id: 'OS-1', title: 'Manual', status: 'Em andamento', createdAt: '', updatedAt: '', lastVersion: 0, observations: '',
  source: 'Inglês', target: 'Português', attachments: [], history: [], ...changes,
}) as TranslationService;

test('translator tasks accept both date formats and only warn while work is owed', () => {
  expect(taskDeadline(task({ deadline: '13/11/2026' }))).toBe('2026-11-13');
  expect(taskDeadlineAlert(task({ deadline: '13/11/2026' }), now)?.label).toBe('Prazo vence amanhã');
  expect(taskDeadlineAlert(task({ status: 'Revisão solicitada', deadline: '2026-11-11' }), now)?.label).toBe('Atrasado há 1 dia');
  expect(taskDeadlineAlert(task({ status: 'Aguardando avaliação', deadline: '2026-11-01' }), now)).toBeNull();
  const ordered = [
    task({ id: 'submitted', status: 'Aguardando avaliação', deadline: '2026-11-01' }),
    task({ id: 'later', deadline: '2026-12-01' }), task({ id: 'none' }), task({ id: 'soon', deadline: '12/11/2026' }),
  ].sort(byTaskUrgency);
  expect(ordered.map(item => item.id)).toEqual(['soon', 'later', 'none', 'submitted']);
});

const offer = (changes: Partial<Offer>) => ({
  id: 'OF-1', requestId: 'SOL-1', title: 'Manual', source: 'Inglês', target: 'Português', service: 'Tradução', compensation: '100',
  currency: 'BRL', deadline: '2026-12-01', expiresAt: new Date(now + 48 * hour).toISOString(), description: '', requirements: '',
  volume: '10 páginas', status: 'pending', createdAt: '', decidedAt: null, serviceId: null, attachments: [], history: [], ...changes,
}) as Offer;

test('pending offers that close first are listed first with their alerts', () => {
  const closing = offer({ id: 'closing', expiresAt: new Date(now + 4 * hour).toISOString(), deadline: '2026-11-13' });
  const alerts = offerDeadlineAlerts(closing, now);
  expect(alerts.response).toEqual({ tone: 'amber', label: 'Responda em até 4 h' });
  expect(alerts.tight).toEqual({ tone: 'amber', label: 'Prazo vence amanhã' });
  expect(offerDeadlineAlerts(offer({ status: 'accepted', deadline: '2026-11-12' }), now)).toEqual({ response: null, tight: null });
  const ordered = [offer({ id: 'answered', status: 'accepted' }), offer({ id: 'later' }), closing].sort(byResponseUrgency);
  expect(ordered.map(item => item.id)).toEqual(['closing', 'later', 'answered']);
});
