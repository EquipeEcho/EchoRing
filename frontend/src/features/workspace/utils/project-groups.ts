import { type Project } from '@/features/workspace/types';

/** Dashboard metric groups; each one opens the operation list through `?grupo=`. */
export const projectGroups = {
  andamento: { label: 'Em andamento', statuses: ['Em tradução', 'Em revisão', 'Em andamento', 'Revisão solicitada'] },
  aguardando: { label: 'Aguardando avaliação', statuses: ['Aguardando aprovação', 'Aguardando avaliação'] },
  hoje: { label: 'Entrega hoje', statuses: [] },
} as const;

export type ProjectGroup = keyof typeof projectGroups;

const closedStatuses = ['Concluído', 'Pronta', 'Entregue'];

export function isProjectGroup(value: unknown): value is ProjectGroup {
  return typeof value === 'string' && value in projectGroups;
}

export function isOpenProject(project: Project) {
  return !closedStatuses.includes(project.status);
}

function todayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function isDueToday(project: Project) {
  return isOpenProject(project) && (project.deadline === 'Hoje' || project.deadline === todayKey());
}

export function matchesProjectGroup(project: Project, group: ProjectGroup) {
  if (group === 'hoje') return isDueToday(project);
  return (projectGroups[group].statuses as readonly string[]).includes(project.status);
}

/** The open project to act on first: due today, then waiting for a decision, then any open one. */
export function nextProject(projects: Project[]) {
  const open = projects.filter(isOpenProject);
  return open.find(isDueToday) ?? open.find(project => matchesProjectGroup(project, 'aguardando')) ?? open[0];
}
