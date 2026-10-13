import { type ManagedRole } from '@/features/users/types';

export const roles: { value: ManagedRole; title: string; description: string }[] = [
  {
    value: 'translator',
    title: 'Tradutor',
    description: 'Acompanha projetos, tarefas e entregas atribuídas.',
  },
  {
    value: 'employee',
    title: 'Funcionário',
    description: 'Atua na operação, solicitações e gestão de projetos.',
  },
  {
    value: 'hr',
    title: 'Recursos Humanos',
    description: 'Acessa informações e áreas relacionadas às pessoas.',
  },
];

export const initialUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'translator' as ManagedRole,
};
