import { expect, test } from '@playwright/test';

import { normalizeProfileRecord } from '../../src/features/translators/services/normalize-profile';
import { type TranslatorProfileRecord } from '../../src/features/translators/types';
import { normalizeRequest, normalizeRequests } from '../../src/features/requests/services/normalize-request';
import { type TranslationRequest } from '../../src/features/requests/types';

test('partial profiles receive empty fields without inventing experience or language skills', () => {
  const source = { account: { name: 'Marina', role: 'translator' }, profile: {
    phone: null, languages: null, tools: null, specializations: ['Técnica', null],
    services: undefined, portfolioLinks: undefined, experienceYears: null,
  } } as unknown as TranslatorProfileRecord;
  const result = normalizeProfileRecord(source);
  expect(result.profile).toMatchObject({ fullName: 'Marina', phone: '', languages: [], tools: [],
    specializations: ['Técnica'], services: [], portfolioLinks: [], experienceYears: null, availabilityHours: null });
  expect(source.profile.languages).toBeNull();
  expect(result.completedAt).toBeNull();
});

test('normalization preserves reported language levels and zero-valued experience', () => {
  const language = { name: 'Inglês', level: 'Fluente' };
  const result = normalizeProfileRecord({ account: { name: 'Marina' }, profile: {
    languages: [language, null, {}], experienceYears: 0, availabilityHours: 0,
  } } as unknown as TranslatorProfileRecord);
  expect(result.profile.languages).toEqual([language]);
  expect(result.profile.experienceYears).toBe(0);
  expect(result.profile.availabilityHours).toBe(0);
});

test('legacy requests receive safe contact and attachment defaults while preserving download error handling', () => {
  const source = { id: 'SOL-OLD', status: 'Recebido', name: null, attachments: null,
    history: null, quote: { amount: '100.00' } } as unknown as TranslationRequest;
  expect(normalizeRequest(source)).toMatchObject({ id: 'SOL-OLD', status: 'Recebido', name: '',
    email: '', attachments: [], history: [], quote: { amount: '100.00', delivery: '', message: '' } });
  expect(source.attachments).toBeNull();
  const file = { name: 'arquivo.txt', size: 10, content: 'invalid-base64***' };
  expect(normalizeRequest({ ...source, attachments: [file] }).attachments).toEqual([file]);
});

test('invalid response roots report a load error instead of fabricating records', () => {
  expect(() => normalizeProfileRecord(null as unknown as TranslatorProfileRecord)).toThrow('carregar os dados do perfil');
  expect(() => normalizeRequest(null as unknown as TranslationRequest)).toThrow('carregar os dados da solicitação');
  expect(() => normalizeRequests({} as TranslationRequest[])).toThrow('carregar a lista');
});
