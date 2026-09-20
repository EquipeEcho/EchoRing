import { Platform } from 'react-native';

export type Attachment = { name: string; size: number; content: string };
export type Intake = {
  name: string; email: string; company: string; title: string; service: string;
  source: string; target: string; deadline: string; message: string; consent: boolean; attachments: Attachment[];
};
export type Quote = { amount: string; delivery: string; message: string };
export type TranslationRequest = Intake & {
  id: string; createdAt: string; status: 'Recebido' | 'Em análise' | 'Orçamento enviado' | 'Orçamento simulado';
  quote?: Quote; emailSentAt?: string; demo?: boolean;
};
export const apiMode = process.env.EXPO_PUBLIC_REQUESTS_MODE === 'api';
const baseURL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const storageKey = 'echoring.translation-requests.v1';

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(baseURL + path, { ...options, signal: controller.signal, headers: {
      'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers,
    } });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof body?.detail === 'string' ? body.detail : 'Não foi possível concluir. Confira os dados e tente novamente.');
    return body as T;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) throw new Error('Não foi possível conectar à empresa. Tente novamente em instantes.');
    throw error;
  } finally { clearTimeout(timer); }
}

export function localRequests(): TranslationRequest[] {
  if (Platform.OS !== 'web') return [];
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function saveLocal(requests: TranslationRequest[]) {
  if (Platform.OS !== 'web') throw new Error('A prévia local está disponível no navegador.');
  try { window.localStorage.setItem(storageKey, JSON.stringify(requests)); }
  catch { throw new Error('O navegador não conseguiu salvar o pedido. Remova arquivos grandes ou libere espaço e tente novamente.'); }
  window.dispatchEvent(new Event('echoring:requests'));
}
export async function submitIntake(data: Intake): Promise<TranslationRequest> {
  if (apiMode) return api('/requests', { method: 'POST', body: JSON.stringify(data) });
  const request: TranslationRequest = { ...data, id: 'SOL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(), createdAt: new Date().toISOString(), status: 'Recebido', demo: true };
  saveLocal([request, ...localRequests()]);
  return request;
}
export async function getRequests(token?: string): Promise<TranslationRequest[]> {
  return token ? api('/requests', {}, token) : localRequests();
}
export async function getRequest(id: string, token?: string): Promise<TranslationRequest> {
  if (token) return api('/requests/' + encodeURIComponent(id), {}, token);
  const request = localRequests().find(item => item.id === id);
  if (!request) throw new Error('Solicitação não encontrada.');
  return request;
}
export async function updateRequest(id: string, changes: { status?: 'Em análise' | 'Orçamento simulado'; quote?: Quote }, token?: string): Promise<TranslationRequest> {
  if (token) return api('/requests/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(changes) }, token);
  const requests = localRequests();
  const request = requests.find(item => item.id === id);
  if (!request) throw new Error('Solicitação não encontrada.');
  Object.assign(request, changes);
  if (changes.quote) request.status = 'Em análise';
  saveLocal(requests);
  return request;
}
export async function sendQuote(id: string, token: string): Promise<TranslationRequest> {
  return api('/requests/' + encodeURIComponent(id) + '/send-quote', { method: 'POST' }, token);
}
export function money(value: string) {
  return Number(value.replace(',', '.')).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export async function selectDocuments(): Promise<Attachment[]> {
  if (Platform.OS !== 'web') throw new Error('Abra o site no navegador para anexar documentos.');
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.pdf,.docx,.txt'; input.multiple = true;
    input.oncancel = () => resolve([]);
    input.onchange = async () => {
      try {
        const files = [...(input.files || [])];
        if (files.length > 3 || files.some(file => file.size > 2 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 5 * 1024 * 1024) throw new Error('Anexe até 3 arquivos, com até 2 MB cada e 5 MB no total.');
        if (files.some(file => !/\.(pdf|docx|txt)$/i.test(file.name) || !file.size)) throw new Error('Escolha documentos PDF, DOCX ou TXT não vazios.');
        const attachments = await Promise.all(files.map(file => new Promise<Attachment>((ok, fail) => {
          const reader = new FileReader();
          reader.onerror = () => fail(new Error('Não foi possível ler o documento.'));
          reader.onload = () => ok({ name: file.name, size: file.size, content: String(reader.result).split(',')[1] });
          reader.readAsDataURL(file);
        })));
        resolve(attachments);
      } catch (error) { reject(error); }
    };
    input.click();
  });
}
export function downloadDocument(file: Attachment) {
  if (Platform.OS !== 'web') return;
  const bytes = Uint8Array.from(atob(file.content), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
