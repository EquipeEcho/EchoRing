import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/features/requests/service';

export type UserRole = 'admin' | 'translator' | 'employee' | 'hr';
export type Session = { name: string; email: string; role: UserRole; demo: boolean; token?: string; expires?: number };
export const roleLabel: Record<UserRole, string> = { admin: 'Administrador geral', translator: 'Tradutor', employee: 'Funcionário', hr: 'Recursos Humanos' };
const demoSession: Session = { name: 'Ana Martins', email: 'demo@echoring.local', role: 'employee', demo: true };
const storageKey = 'echoring.auth-session.v2';
const legacyDemoKey = 'echoring.demo-session.v1';
const legacyStaffKey = 'echoring.staff-session.v1';
const SessionContext = createContext<{ session: Session | null; ready: boolean; enterDemo: () => void; signIn: (email: string, password: string) => Promise<void>; signOut: () => void } | null>(null);

function validSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Session>;
  const knownRole = candidate.role === 'admin' || candidate.role === 'translator' || candidate.role === 'employee' || candidate.role === 'hr';
  return knownRole && typeof candidate.name === 'string' && typeof candidate.email === 'string'
    && (candidate.demo === true || (typeof candidate.token === 'string' && typeof candidate.expires === 'number' && candidate.expires > Date.now() / 1000));
}

async function readStoredSession() {
  const raw = Platform.OS === 'web' ? window.sessionStorage.getItem(storageKey) : await SecureStore.getItemAsync(storageKey);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  return validSession(parsed) ? parsed : null;
}

async function storeSession(value: Session | null) {
  if (Platform.OS === 'web') {
    window.sessionStorage.removeItem(legacyDemoKey);
    window.sessionStorage.removeItem(legacyStaffKey);
    if (value) window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    else window.sessionStorage.removeItem(storageKey);
  } else if (value) await SecureStore.setItemAsync(storageKey, JSON.stringify(value));
  else await SecureStore.deleteItemAsync(storageKey);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void readStoredSession().then(saved => { if (active && saved) setSession(saved); }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
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
    if (email.trim().toLowerCase() === demoSession.email && password === 'EchoRing2026!') { enterDemo(); return; }
    const result = await api<Omit<Session, 'demo'>>('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
    const authenticated: Session = { ...result, demo: false };
    if (!validSession(authenticated)) throw new Error('O servidor retornou uma sessão inválida. Tente novamente.');
    await storeSession(authenticated);
    setSession(authenticated);
  }
  return <SessionContext.Provider value={{ session, ready, enterDemo, signIn, signOut }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider is required');
  return value;
}
