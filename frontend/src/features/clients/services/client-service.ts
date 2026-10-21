import { Platform } from 'react-native';

import { type Session } from '@/features/auth/types';
import { type Client, type ClientDraft } from '@/features/clients/types';
import { api } from '@/lib/api/client';

const storageKey = 'echoring.clients.v1';

function isClient(value: unknown): value is Client {
  if (!value || typeof value !== 'object') return false;
  const client = value as Record<string, unknown>;
  return (
    typeof client.id === 'string' &&
    typeof client.name === 'string' &&
    typeof client.email === 'string' &&
    typeof client.company === 'string' &&
    typeof client.createdAt === 'string'
  );
}

function readLocalClients(): Client[] {
  if (Platform.OS !== 'web') return [];
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isClient)) throw new Error('Formato inválido.');
    return parsed;
  } catch {
    throw new Error('Não foi possível ler os clientes salvos neste navegador.');
  }
}

export function listClients(session: Session): Promise<Client[]> {
  if (session.demo) return Promise.resolve(readLocalClients());
  if (!session.token) return Promise.reject(new Error('Sua sessão expirou. Entre novamente no portal.'));
  return api('/clients', {}, session.token);
}

function saveLocalClient(data: ClientDraft): Client {
  if (Platform.OS !== 'web') {
    throw new Error('O cadastro local de clientes está disponível apenas no navegador.');
  }

  let clients: Client[] = [];
  const stored = window.localStorage.getItem(storageKey);
  if (stored) {
    try {
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.every(isClient)) throw new Error('Formato inválido.');
      clients = parsed;
    } catch {
      throw new Error('Não foi possível ler os clientes salvos neste navegador.');
    }
  }

  if (clients.some((client) => client.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('Já existe um cliente cadastrado com este e-mail.');
  }

  const client: Client = {
    ...data,
    id:
      'CLI-' +
      Date.now().toString(36).toUpperCase() +
      '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([client, ...clients]));
  } catch {
    throw new Error('O navegador não conseguiu salvar o cliente. Libere espaço e tente novamente.');
  }
  return client;
}

export function registerClient(data: ClientDraft, session: Session): Promise<Client> {
  if (session.demo) return Promise.resolve(saveLocalClient(data));
  if (!session.token) throw new Error('Sua sessão expirou. Entre novamente no portal.');
  return api('/clients', { method: 'POST', body: JSON.stringify(data) }, session.token);
}
