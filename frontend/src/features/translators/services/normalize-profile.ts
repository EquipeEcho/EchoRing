import { emptyTranslatorProfile, languageLevels } from '@/features/translators/constants';
import { type TranslatorProfile, type TranslatorProfileRecord } from '@/features/translators/types';

// Older records may predate fields added to the profile form. Keep missing
// information empty rather than treating the TypeScript response type as validation.
export function normalizeProfileRecord(record: TranslatorProfileRecord): TranslatorProfileRecord {
  if (typeof record?.account?.name !== 'string' || !record.profile ||
    typeof record.profile !== 'object' || Array.isArray(record.profile)) {
    throw new Error('Não foi possível carregar os dados do perfil. Tente novamente.');
  }
  const profile = emptyTranslatorProfile(record.account.name || '');
  const source = record.profile;
  for (const key of Object.keys(profile) as (keyof TranslatorProfile)[]) {
    if (typeof profile[key] === 'string' && typeof source[key] === 'string') {
      Object.assign(profile, { [key]: source[key] });
    }
  }
  for (const key of ['specializations', 'services', 'tools', 'portfolioLinks'] as const) {
    profile[key] = Array.isArray(source[key]) ? source[key].filter(value => typeof value === 'string') : [];
  }
  profile.languages = Array.isArray(source.languages) ? source.languages.filter(language =>
    language && typeof language.name === 'string' && languageLevels.includes(language.level)) : [];
  profile.whatsapp = source.whatsapp === true;
  for (const key of ['experienceYears', 'availabilityHours'] as const) {
    const value = source[key];
    profile[key] = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  }
  return { ...record, profile, completedAt: record.completedAt || null, updatedAt: record.updatedAt || null };
}
