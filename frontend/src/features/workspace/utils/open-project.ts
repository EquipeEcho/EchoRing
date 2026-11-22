import { router } from 'expo-router';

import { type Project } from '@/features/workspace/types';

/** Opens a project's record page; real translation tasks open in deliveries instead. */
export function openProject(project: Project, origin: 'dashboard' | 'operacao') {
  if (project.realTaskId) {
    router.push(`/entregas?task=${encodeURIComponent(project.realTaskId)}`);
    return;
  }
  router.push({
    pathname: '/operacao/[id]',
    params: { id: project.id, origin, ...(project.id === 'DEMO-TRAD-001' && { exemplo: 'tradutor' }) },
  });
}
