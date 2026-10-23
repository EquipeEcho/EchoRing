import catalog from './languages.json';

export const normalizeLanguageSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
export const languageOptions = catalog.map(language => language.name);
const aliases = new Map(catalog.map(language => [language.name, normalizeLanguageSearch([language.name, ...language.aliases].join(' '))]));
export const languageMatches = (name: string, query: string) => (aliases.get(name) || normalizeLanguageSearch(name)).includes(normalizeLanguageSearch(query.trim()));
const codes = new Map(catalog.flatMap(language => [language.name, ...language.aliases].map(alias => [normalizeLanguageSearch(alias), language.code] as const)));
for (const language of catalog) codes.set(normalizeLanguageSearch(language.name), language.code);
export const languageCode = (value: string) => codes.get(normalizeLanguageSearch(value.trim())) ?? null;
