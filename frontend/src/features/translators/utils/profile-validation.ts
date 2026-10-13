import { type ProfileErrors, type TranslatorProfile } from '@/features/translators/types';

export function validateProfileStep(profile: TranslatorProfile, step: number): ProfileErrors {
  const errors: ProfileErrors = {};
  if (step === 0) {
    if (profile.fullName.trim().length < 2) errors.fullName = 'Informe seu nome completo.';
    const phone = profile.phone.trim();
    const digits = phone.replace(/\D/g, '');
    if (!/^[+()\d\s.\-/]+$/.test(phone) || digits.length < 7 || digits.length > 15) errors.phone = 'Informe um telefone válido, com código da região.';
    if (profile.country.trim().length < 2) errors.country = 'Informe o país onde você mora.';
    if (profile.city.trim().length < 2) errors.city = 'Informe sua cidade.';
  }
  if (step === 1) {
    const languages = profile.languages.map(language => language.name.trim().toLocaleLowerCase());
    if (languages.length < 2 || languages.some(name => !name) || new Set(languages).size !== languages.length) {
      errors.languages = 'Adicione pelo menos dois idiomas diferentes, com seus níveis de domínio.';
    }
    const pairs = profile.translationPairs.map(pair => [pair.source.trim().toLocaleLowerCase(), pair.target.trim().toLocaleLowerCase()]);
    if (!pairs.length || pairs.some(([source, target]) => source === target || !languages.includes(source) || !languages.includes(target)) || new Set(pairs.map(pair => pair.join('\0'))).size !== pairs.length) {
      errors.translationPairs = 'Adicione pares diferentes, com origem e destino entre os idiomas informados.';
    }
  }
  if (step === 2) {
    if (profile.education.trim().length < 10) errors.education = 'Descreva sua formação em pelo menos 10 caracteres.';
    if (profile.experienceYears === null || !Number.isInteger(profile.experienceYears) || profile.experienceYears < 0 || profile.experienceYears > 80) errors.experienceYears = 'Informe de 0 a 80 anos de experiência.';
    if (profile.experienceSummary.trim().length < 20) errors.experienceSummary = 'Conte sua trajetória em pelo menos 20 caracteres.';
    if (!profile.specializations.length) errors.specializations = 'Adicione pelo menos uma especialização ou área de atuação.';
  }
  if (step === 3 && profile.availabilityHours !== null && (!Number.isInteger(profile.availabilityHours) || profile.availabilityHours < 0 || profile.availabilityHours > 80)) {
    errors.availabilityHours = 'Informe de 0 a 80 horas por semana.';
  }
  return errors;
}

export function validateProfileDraft(profile: TranslatorProfile): ProfileErrors {
  const errors = validateProfileStep(profile, 3);
  if (profile.experienceYears !== null && (!Number.isInteger(profile.experienceYears) || profile.experienceYears < 0 || profile.experienceYears > 80)) {
    errors.experienceYears = 'Informe de 0 a 80 anos de experiência.';
  }
  return errors;
}
