import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { demoSession } from '@/features/auth/constants';
import {
  readStoredSession,
  storeSession,
  validSession,
} from '@/features/auth/services/session-storage';
import { type Session } from '@/features/auth/types';
import { api } from '@/lib/api/client';

const SessionContext = createContext<{
  session: Session | null;
  ready: boolean;
  enterDemo: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
} | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void readStoredSession()
      .then((saved) => {
        if (active && saved) setSession(saved);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function enterDemo() {
    void storeSession(demoSession).catch(() => {});
    setSession(demoSession);
  }
  function signOut() {
    if (session?.token) void api('/auth/logout', { method: 'POST' }, session.token).catch(() => {});
    void storeSession(null).catch(() => {});
    setSession(null);
  }
  async function signIn(email: string, password: string) {
    if (email.trim().toLowerCase() === demoSession.email && password === 'EchoRing2026!') {
      enterDemo();
      return;
    }
    const result = await api<Omit<Session, 'demo'>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const authenticated: Session = { ...result, demo: false };
    if (!validSession(authenticated))
      throw new Error('O servidor retornou uma sessão inválida. Tente novamente.');
    await storeSession(authenticated);
    setSession(authenticated);
  }
  return (
    <SessionContext.Provider value={{ session, ready, enterDemo, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider is required');
  return value;
}
