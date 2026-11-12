import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useSession } from '@/features/auth/contexts/session-context';
import { listRequests } from '@/features/requests/services/request-service';
import { type RequestCounts } from '@/features/requests/types';
import { countRequests } from '@/features/requests/utils/request-query';

const emptyCounts = countRequests([]);

const InboxContext = createContext<{
  /** Counts across every request, without the list filters. */
  counts: RequestCounts;
  received: number;
  /** Changes on every refresh so lists can reload their current page. */
  revision: number;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
} | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [counts, setCounts] = useState<RequestCounts>(emptyCounts);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = session?.token;
  const allowed = session?.demo || session?.role === 'employee' || session?.role === 'admin';
  const refresh = useCallback(async () => {
    if (!allowed) {
      setCounts(emptyCounts);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCounts((await listRequests({ limit: 1 }, token)).counts);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setRevision(current => current + 1);
      setLoading(false);
    }
  }, [allowed, token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const update = () => {
      if (Platform.OS !== 'web' || document.visibilityState === 'visible') void refresh();
    };
    const timer = setInterval(update, 30000);
    if (Platform.OS === 'web') {
      window.addEventListener('storage', update);
      window.addEventListener('focus', update);
      window.addEventListener('echoring:requests', update);
    }
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      if (Platform.OS === 'web') {
        window.removeEventListener('storage', update);
        window.removeEventListener('focus', update);
        window.removeEventListener('echoring:requests', update);
      }
    };
  }, [refresh]);
  return (
    <InboxContext.Provider value={{ counts, received: counts.statuses.Recebido ?? 0, revision, loading, error, refresh }}>
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox() {
  const value = useContext(InboxContext);
  if (!value) throw new Error('InboxProvider is required');
  return value;
}
