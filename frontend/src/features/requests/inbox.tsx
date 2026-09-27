import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useSession } from '@/features/auth/session';
import { getRequests, type TranslationRequest } from './service';

const Context = createContext<{ requests: TranslationRequest[]; loading: boolean; error: string; refresh: () => Promise<void> } | null>(null);
export function InboxProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [requests, setRequests] = useState<TranslationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = session?.token;
  const allowed = session?.demo || session?.role === 'employee' || session?.role === 'admin';
  const refresh = useCallback(async () => {
    if (!allowed) { setRequests([]); setError(''); setLoading(false); return; }
    setLoading(true);
    try { setRequests(await getRequests(token)); setError(''); }
    catch (failure) { setError((failure as Error).message); }
    finally { setLoading(false); }
  }, [allowed, token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const update = () => { if (Platform.OS !== 'web' || document.visibilityState === 'visible') void refresh(); };
    const timer = setInterval(update, 30000);
    if (Platform.OS === 'web') { window.addEventListener('storage', update); window.addEventListener('focus', update); window.addEventListener('echoring:requests', update); }
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      if (Platform.OS === 'web') { window.removeEventListener('storage', update); window.removeEventListener('focus', update); window.removeEventListener('echoring:requests', update); }
    };
  }, [refresh]);
  return <Context.Provider value={{ requests, loading, error, refresh }}>{children}</Context.Provider>;
}
export function useInbox() {
  const value = useContext(Context);
  if (!value) throw new Error('InboxProvider is required');
  return value;
}
