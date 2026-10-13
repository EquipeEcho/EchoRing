import { type Session, type UserRole } from '@/features/auth/types';

export const roleLabel: Record<UserRole, string> = {
  admin: 'Administrador geral',
  translator: 'Tradutor',
  employee: 'Funcionário',
  hr: 'Recursos Humanos',
};

export const demoSession: Session = {
  name: 'Ana Martins',
  email: 'demo@echoring.local',
  role: 'employee',
  demo: true,
};
