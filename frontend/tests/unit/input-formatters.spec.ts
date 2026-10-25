import { expect, test } from '@playwright/test';

import { languageCode, languageMatches, languageOptions, normalizeLanguageSearch } from '../../src/data/language-options';
import { currencyInputFromDecimal, currencyToDecimal, formatCurrencyInput, formatPhoneInput } from '../../src/utils/input-formatters';

test('currency preserves cents, grouping, editing and canonical API decimals', () => {
  for (const input of ['1234,56', '1.234,56', 'R$ 1.234,56', '1234.56']) {
    expect(currencyToDecimal(input)).toBe('1234.56');
    expect(currencyInputFromDecimal(input)).toBe('1.234,56');
  }
  expect(formatCurrencyInput('1234')).toBe('1.234');
  expect(formatCurrencyInput('1.234,')).toBe('1.234,');
  expect(formatCurrencyInput('1.234,5')).toBe('1.234,5');
  expect(formatCurrencyInput('1.234,567')).toBe('1.234,56');
  expect(currencyToDecimal('1.234')).toBe('1234.00');
  expect(currencyInputFromDecimal('0.10')).toBe('0,10');
  for (const invalid of ['', '-100', 'NaN', '1,2,3', '1.00.20']) expect(currencyToDecimal(invalid)).toBe('');
  expect(formatCurrencyInput('')).toBe('');
});

test('phone input formats Brazilian fixed and mobile lines and preserves international numbers', () => {
  expect(formatPhoneInput('11999990000')).toBe('(11) 99999-0000');
  expect(formatPhoneInput('1133334444')).toBe('(11) 3333-4444');
  expect(formatPhoneInput('+5511999990000')).toBe('+55 (11) 99999-0000');
  expect(formatPhoneInput('5511999990000')).toBe('+55 (11) 99999-0000');
  expect(formatPhoneInput('+351 912 345 678')).toBe('+351912345678');
  expect(formatPhoneInput('+123456789012345')).toBe('+123456789012345');
  expect(formatPhoneInput('')).toBe('');
});

test('language catalog contains only the 60 document entries and preserves regional variants', () => {
  expect(languageOptions).toEqual([
    'Albanês', 'Alemão', 'Árabe (Egito)', 'Búlgaro', 'Catalão',
    'Chinês (Simp-HK)', 'Chinês (Simp-Mandarim)', 'Chinês (Trad-Cantonês)', 'Chinês (Trad-TW)',
    'Coreano', 'Crioulo Haitiano', 'Croata', 'Dinamarquês', 'Eslovaco', 'Esloveno',
    'Espanhol (Argentina)', 'Espanhol (Espanha)', 'Espanhol (LATAM)', 'Espanhol (México)',
    'Finlandês', 'Francês (Canadá)', 'Francês (França)', 'Grego', 'Hebraico', 'Hindi', 'Holandês', 'Húngaro',
    'Inglês (Austrália)', 'Inglês (Canadá)', 'Inglês (EUA)', 'Inglês (Reino Unido)',
    'Italiano', 'Japonês', 'Laosiano', 'Latim', 'Letão', 'LIBRAS', 'Lituano', 'Malaio', 'Mongol',
    'Norueguês (Bokmål)', 'Persa', 'Polonês', 'Português (Angola)', 'Português (Brasil)',
    'Português (Moçambique)', 'Português (Portugal)', 'Romeno', 'Russo',
    'Sérvio (Cirílico)', 'Sérvio (Latim)', 'Somali', 'Sueco', 'Tailandês', 'Tcheco', 'Turco',
    'Ucraniano', 'Umbundu (Angola)', 'Urdu', 'Vietnamita',
  ]);
  expect(new Set(languageOptions.map(normalizeLanguageSearch)).size).toBe(60);
  expect(languageMatches('Inglês (EUA)', 'english')).toBe(true);
  expect(languageMatches('Inglês (Reino Unido)', 'en-GB')).toBe(true);
  expect(languageMatches('Português (Brasil)', 'pt-BR')).toBe(true);
  expect(languageMatches('LIBRAS', 'bzs')).toBe(true);
  expect(languageMatches('Holandês', 'dutch')).toBe(true);
  expect(languageCode('English')).toBe(languageCode('Inglês (EUA)'));
  expect(languageCode('Portuguese')).toBe(languageCode('Português (Brasil)'));
  expect(languageCode('Inglês (Canadá)')).not.toBe(languageCode('Inglês (EUA)'));
  expect(languageCode('Bielorrusso')).toBeNull();
  expect(languageCode('Klingon')).toBeNull();
});
