import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

export type Session = { name: string; email: string; role: 'Funcionário'; demo: true };
const demoSession: Session = { name: 'Ana Martins', email: 'demo@echoring.local', role: 'Funcionário', demo: true };
const storageKey = 'echoring.demo-session.v1';
const SessionContext = createContext<{ session: Session | null; ready: boolean; enterDemo: () => void; signIn: (email: string, password: string) => Promise<void>; signOut: () => void } | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      if (Platform.OS === 'web' && window.sessionStorage.getItem(storageKey) === 'active') setSession(demoSession);
    } catch { /* A demo session can still run when browser storage is unavailable. */ }
    setReady(true);
  }, []);
  function enterDemo() {
    try { if (Platform.OS === 'web') window.sessionStorage.setItem(storageKey, 'active'); } catch {}
    setSession(demoSession);
  }
  function signOut() {
    try { if (Platform.OS === 'web') window.sessionStorage.removeItem(storageKey); } catch {}
    setSession(null);
  }
  async function signIn(email: string, password: string) {
    await new Promise(resolve => setTimeout(resolve, 350));
    if (email.trim().toLowerCase() !== demoSession.email || password !== 'EchoRing2026!') {
      throw new Error('Conta não disponível neste ambiente. Use o acesso de demonstração.');
    }
    enterDemo();
  }
  return <SessionContext.Provider value={{ session, ready, enterDemo, signIn, signOut }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider is required');
  return value;
}
