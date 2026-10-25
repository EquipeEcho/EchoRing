import { type LanguageLevel, type TranslatorProfile } from '@/features/translators/types';

export const languageLevels: LanguageLevel[] = ['Nativo', 'Fluente', 'Avançado', 'Intermediário'];
export const profileSteps = ['Contato', 'Idiomas', 'Experiência', 'Seu perfil'];
export const specializationOptions = ['Jurídica', 'Técnica', 'Saúde', 'Acadêmica', 'Literária', 'Marketing', 'Tecnologia', 'Audiovisual'];
export const serviceOptions = ['Tradução', 'Revisão', 'Localização', 'Legendagem', 'Transcrição', 'Interpretação'];

export function emptyTranslatorProfile(name: string): TranslatorProfile {
  return {
    fullName: name, phone: '', whatsapp: false, country: '', city: '', timezone: '',
    professionalTitle: '', bio: '', languages: [], education: '',
    experienceYears: null, experienceSummary: '', specializations: [], services: [],
    tools: [], certifications: '', portfolioLinks: [], availabilityHours: null,
    availabilityNotes: '', otherInformation: '',
  };
}
