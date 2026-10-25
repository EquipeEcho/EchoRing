import { demoTasks } from '@/features/deliveries/data/demo-tasks';
import { emptyTranslatorProfile } from '@/features/translators/constants';
import { type TranslatorProfileRecord } from '@/features/translators/types';

export function demoTranslatorProfile(name: string, email: string, translatorId?: string): TranslatorProfileRecord {
  const translator = translatorId ? demoTasks.find(task => task.translator?.id === translatorId)?.translator : { name, email };
  if (!translator) throw new Error('Este perfil não está disponível na demonstração.');
  const tasks = demoTasks.filter(task => task.translator?.name === translator.name);
  return {
    account: { ...translator, role: 'translator', onboardingRequired: false }, completedAt: null, updatedAt: null,
    profile: { ...emptyTranslatorProfile(translator.name),
      phone: '+55 (11) 99999-0000', country: 'Brasil', city: 'São Paulo', timezone: 'UTC-3',
      professionalTitle: 'Tradução técnica e revisão', bio: 'Perfil demonstrativo de um profissional que transforma conteúdos técnicos em comunicação clara, com atenção à terminologia e ao contexto de cada projeto.',
      languages: [{ name: 'Português', level: 'Nativo' }, { name: 'Inglês', level: 'Fluente' }, { name: 'Espanhol', level: 'Avançado' }],
      education: 'Formação demonstrativa em Letras e cursos de tradução e revisão.', experienceYears: 5,
      experienceSummary: 'Exemplo de trajetória com manuais, contratos e materiais institucionais. Os dados desta página são fictícios.',
      specializations: ['Técnica', 'Tecnologia'], services: ['Tradução', 'Revisão'], tools: ['Ferramentas CAT', 'Glossários'],
      certifications: 'Exemplo de formação complementar em terminologia.', availabilityHours: 20,
      availabilityNotes: 'Exemplo de disponibilidade em dias úteis.',
    },
    activity: { totalProjects: tasks.length, activeProjects: tasks.filter(task => ['Tradutor atribuído', 'Em andamento', 'Revisão solicitada'].includes(task.status)).length,
      awaitingReview: tasks.filter(task => task.status === 'Aguardando avaliação').length,
      completedProjects: tasks.filter(task => ['Pronta', 'Entregue'].includes(task.status)).length },
  };
}
