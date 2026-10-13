import { type Project } from '@/features/workspace/types';

export function matchesSearch(project: Project, search: string) {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  return normalize(project.title + ' ' + project.client + ' ' + project.id).includes(
    normalize(search.trim()),
  );
}
