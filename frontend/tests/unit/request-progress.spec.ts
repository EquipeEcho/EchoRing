import { expect, test } from '@playwright/test';

import { type TranslationRequest } from '../../src/features/requests/types';
import { requestProgress } from '../../src/features/requests/utils/request-progress';

const request = (changes: Partial<TranslationRequest>) => ({
  id: 'SOL-1', title: 'Manual', name: 'Ana', email: 'ana@example.test', company: '', service: 'Tradução',
  source: 'Inglês', target: 'Português', deadline: '', message: '', consent: true, attachments: [],
  createdAt: '2026-11-01T12:00:00Z', status: 'Recebido', ...changes,
}) as TranslationRequest;
const states = (value: TranslationRequest) => requestProgress(value).map(step => step.state);

test('each status marks the finished steps and the one in progress', () => {
  expect(states(request({ status: 'Em análise' }))).toEqual(['done', 'current', 'pending', 'pending', 'pending']);
  expect(states(request({ status: 'Orçamento enviado' }))).toEqual(['done', 'done', 'current', 'pending', 'pending']);
  expect(states(request({ status: 'Revisão solicitada' }))).toEqual(['done', 'done', 'done', 'current', 'pending']);
  expect(states(request({ status: 'Pronta' }))).toEqual(['done', 'done', 'done', 'done', 'current']);
  expect(states(request({ status: 'Entregue' }))).toEqual(['done', 'done', 'done', 'done', 'done']);
});

test('a refused quote stops the tracker at the approval step', () => {
  const progress = requestProgress(request({
    status: 'Orçamento recusado',
    history: [{ status: 'Orçamento recusado', note: '', actorName: 'Cliente', createdAt: '2026-11-04T10:00:00Z' }],
  }));
  expect(progress.map(step => step.state)).toEqual(['done', 'done', 'refused', 'pending', 'pending']);
  expect(progress[2].at).toBe('2026-11-04T10:00:00Z');
});

test('dates come from the first matching event and fall back to recorded fields', () => {
  const progress = requestProgress(request({
    status: 'Entregue',
    emailSentAt: '2026-11-02T09:00:00Z',
    history: [
      { status: 'Orçamento aprovado', note: '', actorName: 'Cliente', createdAt: '2026-11-03T09:00:00Z' },
      { status: 'Tradutor atribuído', note: '', actorName: 'Equipe', createdAt: '2026-11-04T09:00:00Z' },
    ],
    tasks: [
      { id: 'SRV-1', status: 'Entregue', deadline: '', deliveredAt: '2026-11-08T09:00:00Z', translator: { id: 'u1', name: 'Marina', email: '' } },
      { id: 'SRV-2', status: 'Entregue', deadline: '', deliveredAt: '2026-11-09T09:00:00Z', translator: { id: 'u2', name: 'Rafael', email: '' } },
    ],
  }));
  expect(progress.map(step => step.at)).toEqual([
    '2026-11-01T12:00:00Z', '2026-11-02T09:00:00Z', '2026-11-03T09:00:00Z', '2026-11-04T09:00:00Z', '2026-11-09T09:00:00Z',
  ]);
  expect(requestProgress(request({ status: 'Em análise' }))[1].at).toBeUndefined();
});
