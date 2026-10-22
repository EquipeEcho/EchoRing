import { type Session } from '@/features/auth/types';
import { type Client, type ClientDraft } from '@/features/clients/types';
import { api } from '@/lib/api/client';

function requireDatabaseSession(session: Session) {
  if (session.demo) {
    throw new Error('Para salvar clientes no MongoDB, entre com uma conta da equipe fora da demonstração.');
  }
  if (!session.token) throw new Error('Sua sessão expirou. Entre novamente no portal.');
}

export function listClients(session: Session): Promise<Client[]> {
  requireDatabaseSession(session);
  return api('/clients', {}, session.token);
}

export function registerClient(data: ClientDraft, session: Session): Promise<Client> {
  requireDatabaseSession(session);
  return api('/clients', { method: 'POST', body: JSON.stringify(data) }, session.token);
}
