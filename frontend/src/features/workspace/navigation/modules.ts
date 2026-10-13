import {
  ChartNoAxesCombined,
  FolderKanban,
  House,
  Inbox,
  LayoutGrid,
  ListTodo,
  type LucideIcon,
  Settings2,
  UploadCloud,
  UserPlus,
  UsersRound,
  Wallet,
} from 'lucide-react-native';

import { type UserRole } from '@/features/auth/types';

export type WorkspaceModule = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const modules: WorkspaceModule[] = [
  {
    title: 'Visão geral',
    href: '/dashboard',
    icon: LayoutGrid,
    description: 'Pendências e projetos em andamento',
  },
  {
    title: 'Operação',
    href: '/operacao',
    icon: FolderKanban,
    description: 'Requisições, orçamentos e ordens de serviço',
  },
  {
    title: 'Entregas',
    href: '/entregas',
    icon: UploadCloud,
    description: 'Envio de traduções concluídas para revisão',
  },
  {
    title: 'Solicitações',
    href: '/solicitacoes',
    icon: Inbox,
    description: 'Pedidos do site, análise e orçamentos por e-mail',
  },
  {
    title: 'Usuários',
    href: '/usuarios',
    icon: UserPlus,
    description: 'Contas, perfis e acessos à plataforma',
  },
  {
    title: 'Cadastros',
    href: '/area/cadastros',
    icon: UsersRound,
    description: 'Clientes, profissionais e parceiros',
  },
  {
    title: 'Financeiro',
    href: '/area/financeiro',
    icon: Wallet,
    description: 'Vendas, compras e faturamento',
  },
  {
    title: 'Relatórios',
    href: '/area/relatorios',
    icon: ChartNoAxesCombined,
    description: 'Resultados e indicadores',
  },
  {
    title: 'Administração',
    href: '/area/administracao',
    icon: Settings2,
    description: 'Equipe, permissões e configurações',
  },
];

export function modulesFor(role: UserRole) {
  if (role === 'admin') return modules;
  if (role === 'employee')
    return modules.filter((item) => !['/usuarios', '/area/administracao'].includes(item.href));
  if (role === 'hr')
    return modules.filter((item) => ['/dashboard', '/area/cadastros'].includes(item.href));
  return modules.filter((item) => ['/dashboard', '/operacao', '/entregas'].includes(item.href));
}

const tasksModule: WorkspaceModule = {
  title: 'Tarefas',
  href: '/tarefas',
  icon: ListTodo,
  description: 'Pendências e atividades da sua rotina',
};

export function mobilePrimaryModulesFor(role: UserRole): WorkspaceModule[] {
  const available = modulesFor(role);
  const dashboard = available.find((item) => item.href === '/dashboard')!;
  const contextual = available.find(
    (item) => item.href === (role === 'hr' ? '/area/cadastros' : '/operacao'),
  )!;
  return [
    { ...dashboard, title: 'Início', icon: House },
    { ...contextual, title: role === 'translator' ? 'Projetos' : contextual.title },
    tasksModule,
  ];
}

export function mobileMoreModulesFor(role: UserRole): WorkspaceModule[] {
  const primaryHrefs = new Set(mobilePrimaryModulesFor(role).map((item) => item.href));
  return [...modulesFor(role), tasksModule].filter((item) => !primaryHrefs.has(item.href));
}
