import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/features/auth/session';
import { getAssignedServices, type ServiceStatus } from '@/features/deliveries/service';

export type ProjectStatus = 'Em tradução' | 'Em revisão' | 'Aguardando aprovação' | 'Concluído' | 'Nova requisição' | ServiceStatus;
export type Project = { id: string; title: string; client: string; initials: string; languages: string; status: ProjectStatus; deadline: string; owner: string; urgent?: boolean; progress: number; realTaskId?: string };
export type Task = { id: number | string; title: string; project: string; due: string; done: boolean; realTaskId?: string };
const initialProjects: Project[] = [
  { id: 'OS-2026-084', title: 'Manual técnico de operação', client: 'Vértice Engenharia', initials: 'VE', languages: 'Português → Inglês', status: 'Em tradução', deadline: 'Hoje', owner: 'Camila Rocha', urgent: true, progress: 55 },
  { id: 'OS-2026-083', title: 'Contrato de prestação de serviços', client: 'Almeida & Associados', initials: 'AA', languages: 'Inglês → Português', status: 'Em revisão', deadline: 'Hoje', owner: 'Lucas Ferreira', progress: 80 },
  { id: 'OR-2026-042', title: 'Apresentação institucional', client: 'Horizonte Digital', initials: 'HD', languages: 'Português → Espanhol', status: 'Aguardando aprovação', deadline: 'Amanhã', owner: 'Ana Martins', progress: 20 },
  { id: 'OS-2026-082', title: 'Documentação de produto', client: 'Nova Saúde', initials: 'NS', languages: 'Inglês → Português', status: 'Em tradução', deadline: 'Em 2 dias', owner: 'Marina Costa', progress: 40 },
  { id: 'OS-2026-081', title: 'Relatório de sustentabilidade', client: 'Vértice Engenharia', initials: 'VE', languages: 'Português → Inglês', status: 'Em tradução', deadline: 'Em 3 dias', owner: 'Camila Rocha', progress: 65 },
  { id: 'OS-2026-080', title: 'Certificado acadêmico', client: 'Carolina Oliveira', initials: 'CO', languages: 'Português → Francês', status: 'Concluído', deadline: 'Entregue', owner: 'Pedro Silva', progress: 100 },
];
const initialTasks: Task[] = [
  { id: 1, title: 'Revisar contrato traduzido', project: 'OS-2026-083', due: 'Hoje, 14h', done: false },
  { id: 2, title: 'Confirmar prazo com a tradutora', project: 'OS-2026-084', due: 'Hoje, 16h', done: false },
  { id: 3, title: 'Acompanhar aprovação do orçamento', project: 'OR-2026-042', due: 'Amanhã', done: false },
  { id: 4, title: 'Conferir documentos recebidos', project: 'OS-2026-082', due: 'Concluída', done: true },
];
export const statusTone = {
  'Em tradução': 'blue', 'Em revisão': 'green', 'Aguardando aprovação': 'amber', 'Concluído': 'neutral', 'Nova requisição': 'green',
  'Tradutor atribuído': 'blue', 'Em andamento': 'blue', 'Aguardando avaliação': 'green', 'Revisão solicitada': 'amber', Pronta: 'green', Entregue: 'neutral',
} as const;
type Workspace = {
  projects: Project[]; tasks: Task[]; toggleTask: (id: number | string) => void; search: string; setSearch: (value: string) => void;
  selected: Project | null; setSelected: (project: Project | null) => void; newRequest: boolean; setNewRequest: (open: boolean) => void;
  addRequest: (data: { title: string; client: string; languages: string }) => void;
};
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [projects, setProjects] = useState(session?.demo ? initialProjects : []);
  const [tasks, setTasks] = useState(session?.demo ? initialTasks : []);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const [newRequest, setNewRequest] = useState(false);
  useEffect(() => {
    if (!session?.token || session.role === 'hr') return;
    let active = true;
    void getAssignedServices(session.token).then(services => {
      if (!active) return;
      setProjects(services.map(service => ({
        id: service.id, realTaskId: service.id, title: service.title,
        client: service.clientName || service.company || 'Cliente',
        initials: (service.clientName || 'CL').split(/\s+/).slice(0, 2).map(value => value[0]).join('').toUpperCase(),
        languages: `${service.source} → ${service.target}`, status: service.status,
        deadline: service.deadline || 'A definir', owner: service.translator?.name || session.name,
        progress: service.status === 'Entregue' ? 100 : service.status === 'Pronta' ? 90 : service.status === 'Aguardando avaliação' ? 75 : service.status === 'Em andamento' ? 40 : 10,
      })));
      setTasks(services.map(service => ({
        id: service.id, realTaskId: service.id, title: service.title, project: service.id,
        due: service.deadline || 'A definir', done: service.status === 'Entregue',
      })));
    }).catch(() => { if (active) { setProjects([]); setTasks([]); } });
    return () => { active = false; };
  }, [session]);
  function addRequest(data: { title: string; client: string; languages: string }) {
    setProjects(current => [{ ...data, id: 'REQ-' + String(current.length + 1).padStart(3, '0'), initials: data.client.split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase(), status: 'Nova requisição', deadline: 'A definir', owner: 'Ana Martins', progress: 0 }, ...current]);
    setNewRequest(false);
  }
  return <Context.Provider value={{ projects, tasks, search, setSearch, selected, setSelected, newRequest, setNewRequest, addRequest,
    toggleTask: id => setTasks(current => current.map(task => task.id === id ? { ...task, done: !task.done } : task)) }}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('WorkspaceProvider is required');
  return value;
}
export function matchesSearch(project: Project, search: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalize(project.title + ' ' + project.client + ' ' + project.id).includes(normalize(search.trim()));
}
