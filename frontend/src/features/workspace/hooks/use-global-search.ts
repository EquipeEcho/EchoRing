import { type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { type BadgeTone } from '@/components/ui/badge';
import { useSession } from '@/features/auth/contexts/session-context';
import { requestStatusTone } from '@/features/requests/constants/status';
import { listRequests } from '@/features/requests/services/request-service';
import { type TranslationRequest } from '@/features/requests/types';
import { statusTone } from '@/features/workspace/constants/status';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { matchesSearch } from '@/features/workspace/utils/search';

export type SearchResult = { key: string; title: string; detail: string; status?: string; tone?: BadgeTone; href: Href };
export type SearchGroup = { key: 'solicitacoes' | 'projetos' | 'tarefas'; label: string; results: SearchResult[]; more?: Href };

const groupLimit = 5;
const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function requestResult(request: TranslationRequest): SearchResult {
  return {
    key: request.id,
    title: request.title,
    detail: `${request.id} · ${request.name || 'Cliente não informado'}`,
    status: request.status,
    tone: requestStatusTone[request.status],
    href: { pathname: '/solicitacoes/[id]', params: { id: request.id } },
  };
}

/** Results for the header search, grouped by area; requests come from the server search. */
export function useGlobalSearch(query: string) {
  const { session } = useSession();
  const { projects, tasks } = useWorkspace();
  const term = query.trim();
  const canSeeRequests = !!session && (session.demo || session.role === 'admin' || session.role === 'employee');
  const [requests, setRequests] = useState<{ term: string; items: TranslationRequest[]; total: number } | null>(null);
  const token = session?.token;

  useEffect(() => {
    if (!canSeeRequests || term.length < 2) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const page = await listRequests({ search: term, limit: groupLimit }, token);
        if (active) setRequests({ term, items: page.items, total: page.total });
      } catch {
        // The header search stays usable with projects and tasks if the request search fails.
        if (active) setRequests({ term, items: [], total: 0 });
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [canSeeRequests, term, token]);

  if (term.length < 2) return { groups: [] as SearchGroup[], loading: false };
  const loading = canSeeRequests && requests?.term !== term;
  const foundRequests = requests?.term === term ? requests : null;
  const groups: SearchGroup[] = [];
  if (canSeeRequests && foundRequests?.items.length) {
    groups.push({
      key: 'solicitacoes', label: 'Solicitações', results: foundRequests.items.map(requestResult),
      ...(foundRequests.total > groupLimit && { more: { pathname: '/solicitacoes', params: { search: term } } }),
    });
  }
  const matchingProjects = projects.filter(project => matchesSearch(project, term));
  if (matchingProjects.length) {
    groups.push({
      key: 'projetos', label: 'Projetos',
      results: matchingProjects.slice(0, groupLimit).map(project => ({
        key: project.id, title: project.title, detail: `${project.id} · ${project.client}`, status: project.status,
        tone: statusTone[project.status],
        href: project.realTaskId ? { pathname: '/entregas', params: { task: project.realTaskId } }
          : { pathname: '/operacao/[id]', params: { id: project.id, origin: 'operacao' } },
      })),
      ...(matchingProjects.length > groupLimit && { more: '/operacao' as Href }),
    });
  }
  const matchingTasks = tasks.filter(task => fold(`${task.title} ${task.project}`).includes(fold(term)));
  if (matchingTasks.length) {
    groups.push({
      key: 'tarefas', label: 'Tarefas',
      results: matchingTasks.slice(0, groupLimit).map(task => ({
        key: String(task.id), title: task.title, detail: `${task.project} · ${task.due}`,
        status: task.done ? 'Concluída' : 'Pendente', tone: task.done ? 'green' : 'amber',
        href: task.realTaskId ? { pathname: '/entregas', params: { task: task.realTaskId } } : '/tarefas',
      })),
      ...(matchingTasks.length > groupLimit && { more: '/tarefas' as Href }),
    });
  }
  return { groups, loading };
}
