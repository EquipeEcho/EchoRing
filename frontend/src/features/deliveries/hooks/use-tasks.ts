import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/contexts/session-context';
import { demoTasks } from '@/features/deliveries/data/demo-tasks';
import { getAssignedServices } from '@/features/deliveries/services/delivery-service';
import { type TranslationService } from '@/features/deliveries/types';

export function useTasks() {
  const { session } = useSession();
  const token = session?.token;
  const demo = !!session?.demo;
  const [tasks, setTasks] = useState<TranslationService[]>(() => (demo ? demoTasks : []));
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (demo || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTasks(await getAssignedServices(token));
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setLoading(false);
    }
  }, [demo, token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(initial);
  }, [refresh]);
  return { token, tasks, loading, error, setError, setTasks, refresh, demo };
}
