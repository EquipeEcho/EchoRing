import { type ManagedUser, type NewUser } from '@/features/users/types';
import { api } from '@/lib/api/client';

export function getUsers(token: string) {
  return api<ManagedUser[]>('/users', {}, token);
}

export function createUser(data: NewUser, token: string) {
  return api<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(data) }, token);
}
