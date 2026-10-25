import { expect, test } from '@playwright/test';

import { dateFromValue, dateKey, formatSelectedDate } from '../../src/components/ui/fields/date-utils';

test('impossible dates and malformed date values are rejected without changing their display', () => {
  for (const value of ['', '2026-02-31', '2026-02-29', '1900-02-29', '2100-02-29',
    '2026-13-01', '2026-00-10', '2026-01-00', '2026-01-32', '2026-2-01', '31/02/2026', '2026-02-28T12:00:00Z']) {
    expect(dateFromValue(value), value).toBeNull();
    expect(formatSelectedDate(value), value).toBe(value);
  }
});

test('valid dates preserve their calendar components, including leap years and years below 100', () => {
  for (const value of ['2026-02-28', '2024-02-29', '2000-02-29', '0099-01-31', '0000-02-29']) {
    const parsed = dateFromValue(value);
    expect(parsed, value).not.toBeNull();
    expect(dateKey(parsed!)).toBe(value);
    expect(parsed!.getHours()).toBe(12);
  }
  expect(formatSelectedDate('2026-02-28')).toContain('28 de fevereiro de 2026');
});
