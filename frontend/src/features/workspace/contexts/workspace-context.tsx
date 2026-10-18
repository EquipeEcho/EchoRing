import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/contexts/session-context';
import { getAssignedServices } from '@/features/deliveries/services/delivery-service';
import { initialProjects, initialTasks } from '@/features/workspace/data/demo-workspace';
import { type Project, type Workspace } from '@/features/workspace/types';

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [projects, setProjects] = useState(session?.demo ? initialProjects : []);
  const [tasks, setTasks] = useState(session?.demo ? initialTasks : []);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const [newRequest, setNewRequest] = useState(false);
  const [revision, setRevision] = useState(0);
  const [settledRevision, setSettledRevision] = useState(-1);
  const [failure, setFailure] = useState<{ revision: number; message: string } | null>(null);
  const loading = !!session?.token && session.role !== 'hr' && revision !== settledRevision;
  const loadError = failure?.revision === revision ? failure.message : '';
  useEffect(() => {
    if (!session?.token || session.role === 'hr') return;
    let active = true;
    void getAssignedServices(session.token)
      .then((services) => {
        if (!active) return;
        setFailure(null);
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
            owner: service.translator?.name || session.name,
            progress:
              service.status === 'Entregue'
                ? 100
                : service.status === 'Pronta'
                  ? 90
                  : service.status === 'Aguardando avaliação'
                    ? 75
                    : service.status === 'Em andamento'
                      ? 40
                      : 10,
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
  }, [session, revision]);
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
    setNewRequest(false);
  }
  return (
    <WorkspaceContext.Provider
      value={{
        loading,
        loadError,
        refresh: () => setRevision(current => current + 1),
        projects,
        tasks,
        search,
        setSearch,
        selected,
        setSelected,
        newRequest,
        setNewRequest,
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
