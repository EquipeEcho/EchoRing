import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/contexts/session-context';
import { demoTasks } from '@/features/deliveries/data/demo-tasks';
import { getAssignedServices } from '@/features/deliveries/services/delivery-service';
import { type TranslationService } from '@/features/deliveries/types';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';

export function useTasks() {
  const { session } = useSession();
  const { applyServices } = useWorkspace();
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
      const services = await getAssignedServices(token);
      setTasks(services);
      applyServices(services);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setLoading(false);
    }
  }, [applyServices, demo, token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 30000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);
  return { token, tasks, loading, error, setError, setTasks, refresh, demo };
}
