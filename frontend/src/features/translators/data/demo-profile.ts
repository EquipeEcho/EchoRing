import { emptyTranslatorProfile } from '@/features/translators/constants';
import { type TranslatorProfileRecord } from '@/features/translators/types';

export function demoTranslatorProfile(name: string, email: string): TranslatorProfileRecord {
  const translator = { name, email };
  return {
    account: { ...translator, role: 'translator', onboardingRequired: false }, completedAt: null, updatedAt: null,
    profile: { ...emptyTranslatorProfile(translator.name),
      phone: '+55 (11) 99999-0000', country: 'Brasil', city: 'São Paulo', timezone: 'UTC-3',
      professionalTitle: 'Tradução técnica e revisão', bio: 'Perfil demonstrativo de um profissional que transforma conteúdos técnicos em comunicação clara, com atenção à terminologia e ao contexto de cada projeto.',
      languages: [{ name: 'Português', level: 'Nativo' }, { name: 'Inglês', level: 'Fluente' }, { name: 'Espanhol', level: 'Avançado' }],
      translationPairs: [{ source: 'Inglês', target: 'Português' }, { source: 'Espanhol', target: 'Português' }],
      education: 'Formação demonstrativa em Letras e cursos de tradução e revisão.', experienceYears: 5,
      experienceSummary: 'Exemplo de trajetória com manuais, contratos e materiais institucionais. Os dados desta página são fictícios.',
      specializations: ['Técnica', 'Tecnologia'], services: ['Tradução', 'Revisão'], tools: ['Ferramentas CAT', 'Glossários'],
      certifications: 'Exemplo de formação complementar em terminologia.', availabilityHours: 20,
      availabilityNotes: 'Exemplo de disponibilidade em dias úteis.',
    },
  };
}

