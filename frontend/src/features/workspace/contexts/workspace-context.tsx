import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/contexts/session-context';
import { getAssignedServices } from '@/features/deliveries/services/delivery-service';
import { type TranslationService } from '@/features/deliveries/types';
import { initialProjects, initialTasks } from '@/features/workspace/data/demo-workspace';
import { type Workspace } from '@/features/workspace/types';

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [services, setServices] = useState<TranslationService[]>([]);
  const [projects, setProjects] = useState(session?.demo ? initialProjects : []);
  const [tasks, setTasks] = useState(session?.demo ? initialTasks : []);
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(current => current + 1), []);
  const [settledRevision, setSettledRevision] = useState(-1);
  const [failure, setFailure] = useState<{ revision: number; message: string } | null>(null);
  const loading = !!session?.token && session.role !== 'hr' && revision !== settledRevision;
  const loadError = failure?.revision === revision ? failure.message : '';
  const applyServices = useCallback((services: TranslationService[]) => {
    setFailure(null);
    setServices(services);
    setProjects(
      services.map((service) => ({
        id: service.id,
        realTaskId: service.id,
        title: service.title,
        client: service.clientName || service.company || 'Cliente',
        initials: (service.clientName || 'CL')
          .split(/\s+/)
          .slice(0, 2)
          .map((value) => value[0])
          .join('')
          .toUpperCase(),
        languages: `${service.source} → ${service.target}`,
        status: service.status,
        deadline: service.deadline || 'A definir',
        owner: service.translator?.name || session?.name || '',
        progress:
          service.workflow?.progress ?? (service.status === 'Entregue'
            ? 100
            : service.status === 'Pronta'
              ? 90
              : service.status === 'Aguardando avaliação'
                ? 75
                : service.status === 'Em andamento'
                  ? 40
                  : 10),
      })),
    );
    setTasks(
      services.map((service) => ({
        id: service.id,
        realTaskId: service.id,
        title: service.title,
        project: service.id,
        due: service.deadline || 'A definir',
        done: ['Pronta', 'Entregue'].includes(service.status),
      })),
    );
  }, [session?.name]);
  useEffect(() => {
    if (!session?.token || session.role === 'hr') return;
    let active = true;
    void getAssignedServices(session.token)
      .then((services) => {
        if (!active) return;
        applyServices(services);
      })
      .catch((error: unknown) => {
        if (active) {
          setFailure({ revision, message: error instanceof Error ? error.message : 'Não foi possível carregar seus projetos.' });
        }
      })
      .finally(() => {
        if (active) setSettledRevision(revision);
      });
    return () => {
      active = false;
    };
  }, [applyServices, session, revision]);
  function addRequest(data: { title: string; client: string; languages: string }) {
    setProjects((current) => [
      {
        ...data,
        id: 'REQ-' + String(current.length + 1).padStart(3, '0'),
        initials: data.client
          .split(/\s+/)
          .slice(0, 2)
          .map((v) => v[0])
          .join('')
          .toUpperCase(),
        status: 'Nova requisição',
        deadline: 'A definir',
        owner: 'Ana Martins',
        progress: 0,
      },
      ...current,
    ]);
  }
  return (
    <WorkspaceContext.Provider
      value={{
        services,
        applyServices,
        loading,
        loadError,
        refresh,
        projects,
        tasks,
        search,
        setSearch,
        addRequest,
        toggleTask: (id) =>
          setTasks((current) =>
            current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
          ),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('WorkspaceProvider is required');
  return value;
}
