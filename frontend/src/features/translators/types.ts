import { type Account } from '@/features/auth/types';

export type LanguageLevel = 'Nativo' | 'Fluente' | 'Avançado' | 'Intermediário';
export type TranslatorLanguage = { name: string; level: LanguageLevel };

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
  activity?: { totalProjects: number; activeProjects: number; awaitingReview: number; completedProjects: number };
};

export type ProfileErrors = Partial<Record<keyof TranslatorProfile, string>>;
