import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { type Session } from '@/features/auth/types';

const storageKey = 'echoring.auth-session.v2';

const legacyDemoKey = 'echoring.demo-session.v1';

const legacyStaffKey = 'echoring.staff-session.v1';

export function validSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Session>;
  const knownRole =
    candidate.role === 'admin' ||
    candidate.role === 'translator' ||
    candidate.role === 'employee' ||
    candidate.role === 'hr';
  return (
    knownRole &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    (candidate.onboardingRequired === undefined || typeof candidate.onboardingRequired === 'boolean') &&
    (candidate.demo === true ||
      (typeof candidate.token === 'string' &&
        typeof candidate.expires === 'number' &&
        candidate.expires > Date.now() / 1000))
  );
}

export async function readStoredSession() {
  const raw =
    Platform.OS === 'web'
      ? window.sessionStorage.getItem(storageKey)
      : await SecureStore.getItemAsync(storageKey);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  return validSession(parsed) ? parsed : null;
}

export async function storeSession(value: Session | null) {
  if (Platform.OS === 'web') {
    window.sessionStorage.removeItem(legacyDemoKey);
    window.sessionStorage.removeItem(legacyStaffKey);
    if (value) window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    else window.sessionStorage.removeItem(storageKey);
  } else if (value) await SecureStore.setItemAsync(storageKey, JSON.stringify(value));
  else await SecureStore.deleteItemAsync(storageKey);
}
