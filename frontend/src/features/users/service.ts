import { api } from '@/features/requests/service';
import type { UserRole } from '@/features/auth/session';

export type ManagedRole = Exclude<UserRole, 'admin'>;
export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
};
export type NewUser = { name: string; email: string; password: string; role: ManagedRole };

export function getUsers(token: string) {
  return api<ManagedUser[]>('/users', {}, token);
}

export function createUser(data: NewUser, token: string) {
  return api<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(data) }, token);
}
