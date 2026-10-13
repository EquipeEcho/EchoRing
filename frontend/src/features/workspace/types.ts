import { type ServiceStatus } from '@/features/deliveries/types';

export type ProjectStatus =
  | 'Em tradução'
  | 'Em revisão'
  | 'Aguardando aprovação'
  | 'Concluído'
  | 'Nova requisição'
  | ServiceStatus;

export type Project = {
  id: string;
  title: string;
  client: string;
  initials: string;
  languages: string;
  status: ProjectStatus;
  deadline: string;
  owner: string;
  urgent?: boolean;
  progress: number;
  realTaskId?: string;
};

export type Task = {
  id: number | string;
  title: string;
  project: string;
  due: string;
  done: boolean;
  realTaskId?: string;
};

export type Workspace = {
  projects: Project[];
  tasks: Task[];
  toggleTask: (id: number | string) => void;
  search: string;
  setSearch: (value: string) => void;
  selected: Project | null;
  setSelected: (project: Project | null) => void;
  newRequest: boolean;
  setNewRequest: (open: boolean) => void;
  addRequest: (data: { title: string; client: string; languages: string }) => void;
};
