import { type Account } from '@/features/auth/types';

export type LanguageLevel = 'Nativo' | 'Fluente' | 'Avançado' | 'Intermediário';
export type TranslatorLanguage = { name: string; level: LanguageLevel };
export type TranslationPair = { source: string; target: string };

export type TranslatorProfile = {
  fullName: string;
  phone: string;
  whatsapp: boolean;
  country: string;
  city: string;
  timezone: string;
  professionalTitle: string;
  bio: string;
  languages: TranslatorLanguage[];
  translationPairs: TranslationPair[];
  education: string;
  experienceYears: number | null;
  experienceSummary: string;
  specializations: string[];
  services: string[];
  tools: string[];
  certifications: string;
  portfolioLinks: string[];
  availabilityHours: number | null;
  availabilityNotes: string;
  otherInformation: string;
};

export type TranslatorProfileRecord = {
  profile: TranslatorProfile;
  account: Account;
  completedAt: string | null;
  updatedAt: string | null;
};

export type ProfileErrors = Partial<Record<keyof TranslatorProfile, string>>;
