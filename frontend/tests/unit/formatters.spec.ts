import { expect, test } from '@playwright/test';

import { brl } from '../../src/utils/formatters';

test('numeric amounts from the finance API are shown in Brazilian reais', () => {
  expect(brl(1234.5)).toBe('R$\u00a01.234,50');
  expect(brl(0)).toBe('R$\u00a00,00');
  expect(brl(-80)).toBe('-R$\u00a080,00');
});
