import { type ServiceStatus, type TranslationService } from '@/features/deliveries/types';

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
  demo?: boolean;
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
  services: TranslationService[];
  applyServices: (services: TranslationService[]) => void;
  loading: boolean;
  loadError: string;
  refresh: () => void;
  projects: Project[];
  tasks: Task[];
  toggleTask: (id: number | string) => void;
  search: string;
  setSearch: (value: string) => void;
  addRequest: (data: { title: string; client: string; languages: string }) => void;
};
