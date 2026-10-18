import { type TranslatorProfile } from '@/features/translators/types';

export function profileCompleteness(profile: TranslatorProfile) {
  const fields = [profile.fullName, profile.phone, profile.country && profile.city, profile.professionalTitle, profile.bio,
    profile.languages.length, profile.translationPairs.length, profile.education, profile.experienceYears !== null,
    profile.experienceSummary, profile.specializations.length, profile.services.length, profile.tools.length,
    profile.certifications, profile.portfolioLinks.length, profile.availabilityHours !== null];
  const filled = fields.filter(Boolean).length;
  return { filled, total: fields.length, percent: Math.round(filled / fields.length * 100) };
}

export function profileLink(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && url.hostname && !url.username && !url.password && !/\s/.test(value) ? url : null;
  } catch { return null; }
}

