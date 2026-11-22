import { expect, test } from '@playwright/test';

import { quoteTotal, requestTargets, requestTasks, workTargets } from '../../src/features/requests/utils/quote-scope';
import { type TranslationRequest } from '../../src/features/requests/types';

test('commercial totals use cents and keep Brazilian and API decimal formats compatible', () => {
  const items = ['0.10', '0,20', '1.234,56'].map((amount, index) => ({ target: `Language ${index}`, delivery: '2099-01-10', amount }));
  expect(quoteTotal(items)).toBe('1234.86');
  expect(quoteTotal(items.slice(0, 2))).toBe('0.30');
});

test('partial approval changes only the work scope and preserves the full proposal', () => {
  const request = { target: 'Inglês', targets: ['Inglês', 'Espanhol'], approvedTargets: ['Espanhol'] } as TranslationRequest;
  expect(requestTargets(request)).toEqual(['Inglês', 'Espanhol']);
  expect(workTargets(request)).toEqual(['Espanhol']);
  expect(requestTasks(request)).toEqual([]);
});

test('legacy requests still expose their single language and task', () => {
  const request = { target: 'Inglês', task: { id: 'TRD-OLD' } } as TranslationRequest;
  expect(requestTargets(request)).toEqual(['Inglês']);
  expect(workTargets(request)).toEqual(['Inglês']);
  expect(requestTasks(request)).toEqual([{ id: 'TRD-OLD' }]);
});
