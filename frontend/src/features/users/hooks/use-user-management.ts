import { useCallback, useEffect, useState } from 'react';

import { roleLabel } from '@/features/auth/constants';
import { useSession } from '@/features/auth/contexts/session-context';
import { initialUserForm } from '@/features/users/constants';
import { createUser, getUsers } from '@/features/users/services/user-service';
import { type ManagedRole, type ManagedUser } from '@/features/users/types';

export function useUserManagement() {
  const { session } = useSession();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ ...initialUserForm });
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | ManagedRole>('all');
  const token = session?.token;
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const visibleUsers = users.filter(
    (user) =>
      (roleFilter === 'all' || user.role === roleFilter) &&
      (!normalizedSearch ||
        `${user.name} ${user.email}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)),
  );
  const roleFilters: { value: 'all' | 'admin' | ManagedRole; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'admin', label: 'Administradores' },
    { value: 'employee', label: 'Funcionários' },
    { value: 'translator', label: 'Tradutores' },
    { value: 'hr', label: 'RH' },
  ];
  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setUsers(await getUsers(token));
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    return () => clearTimeout(initial);
  }, [load]);
  function change<K extends keyof typeof data>(key: K, value: (typeof data)[K]) {
    setData((current) => ({ ...current, [key]: value }));
    setError('');
  }
  function begin() {
    setData({ ...initialUserForm });
    setVisible(false);
    setError('');
    setOpen(true);
  }
  async function submit() {
    if (busy || !token) return;
    const email = data.email.trim().toLowerCase();
    if (data.name.trim().length < 2) {
      setError('Informe o nome completo.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (data.password.length < 12) {
      setError('A senha inicial deve ter pelo menos 12 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const created = await createUser({ ...data, name: data.name.trim(), email }, token);
      setUsers((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      );
      setOpen(false);
      setNotice(`${created.name} já pode acessar a plataforma como ${roleLabel[created.role]}.`);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return {
    begin,
    notice,
    error,
    open,
    load,
    users,
    search,
    setSearch,
    roleFilters,
    roleFilter,
    setRoleFilter,
    loading,
    visibleUsers,
    busy,
    setOpen,
    data,
    change,
    visible,
    setVisible,
    submit,
  };
}
