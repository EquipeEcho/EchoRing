import { type UserRole } from '@/features/auth/types';

export type ManagedRole = Exclude<UserRole, 'admin'>;

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  onboardingRequired?: boolean;
};

export type NewUser = { name: string; email: string; password: string; role: ManagedRole };
