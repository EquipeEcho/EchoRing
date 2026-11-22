import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/contexts/session-context';
import { getFinanceOverview } from '@/features/finance/services/finance-service';
import { type FinanceOverview } from '@/features/finance/types';

export function useFinanceOverview() {
  const { session } = useSession();
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = session?.token;
  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setOverview(await getFinanceOverview(token));
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
  return { overview, loading, error, load };
}
