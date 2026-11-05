import { expect, test } from '@playwright/test';

import { type Intake } from '../../src/features/requests/types';
import { normalizeIntake, validateIntake } from '../../src/features/requests/utils/intake-validation';

const intake: Intake = { name: ' Cliente ', email: 'client@example.test', company: ' Empresa ',
  title: ' Manual ', service: 'Tradução', source: 'Português (Brasil)', target: 'Inglês (EUA)',
  message: ' Traduzir o manual. ', deadline: '', consent: true, attachments: [] };

test('legacy and manual intake still use the shared required-field, contact and consent validation', () => {
  expect(validateIntake(intake).error).toBe('');
  expect(validateIntake({ ...intake, consent: false }).fieldErrors.consent).toBeTruthy();
  expect(validateIntake({ ...intake, email: 'invalid' }).invalid).toContain('email');
  expect(validateIntake({ ...intake, service: '' }, 'project').invalid).toContain('service');
  expect(normalizeIntake(intake)).toMatchObject({ name: 'Cliente', company: 'Empresa', target: 'Inglês (EUA)', targets: ['Inglês (EUA)'] });
});

test('shared validation rejects repeated aliases, unknown or empty targets and the source language', () => {
  for (const targets of [['Inglês (EUA)', 'English'], ['Inglês (EUA)', ''], ['Klingon'], ['Português (Brasil)']]) {
    expect(validateIntake({ ...intake, targets }).invalid).toContain('target');
  }
  const multiple = { ...intake, targets: [' Inglês (EUA) ', ' Espanhol (Espanha) '] };
  expect(validateIntake(multiple).error).toBe('');
  expect(normalizeIntake(multiple).targets).toEqual(['Inglês (EUA)', 'Espanhol (Espanha)']);
});
