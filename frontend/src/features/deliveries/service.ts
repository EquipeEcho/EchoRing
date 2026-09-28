import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api, downloadProtectedDocument, type Attachment, type WorkflowEvent } from '@/features/requests/service';

export type ServiceStatus = 'Tradutor atribuído' | 'Em andamento' | 'Aguardando avaliação' | 'Revisão solicitada' | 'Pronta' | 'Entregue';
export type TranslationService = {
  id: string; requestId?: string; title: string; status: ServiceStatus;
  deadline?: string; createdAt: string; updatedAt: string; startedAt?: string; readyAt?: string; deliveredAt?: string; lastVersion: number; lastFeedback?: string;
  observations: string; source: string; target: string; clientName?: string; clientEmail?: string;
  company?: string; attachments: Attachment[]; history: WorkflowEvent[];
  translator?: { id: string; name: string; email: string };
  lastDelivery?: { id: string; name: string; size: number; status: string; version: number; submittedAt: string; feedback: string; files?: DeliveryFile[] };
};
export type DeliveryFile = { index: number; name: string; mediaType: string; size: number };
export type Delivery = {
  id: string; serviceId: string; serviceTitle: string; version: number;
  translatorName: string; name: string; mediaType: string; size: number;
  status: 'Aguardando avaliação' | 'Revisão solicitada' | 'Pronta' | 'Entregue'; submittedAt: string;
  files?: DeliveryFile[];
  feedback?: string; reviewedAt?: string; reviewerName?: string;
};

const allowedExtensions = /\.(pdf|docx|txt)$/i;
const maxBytes = 5 * 1024 * 1024;

export async function getAssignedServices(token: string) {
  return api<TranslationService[]>('/tasks', {}, token);
}

export function getTask(taskId: string, token: string) {
  return api<TranslationService>(`/tasks/${encodeURIComponent(taskId)}`, {}, token);
}

export function startTask(taskId: string, token: string) {
  return api<TranslationService>(`/tasks/${encodeURIComponent(taskId)}/start`, { method: 'POST' }, token);
}

export async function selectTranslationDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) return null;
  const assets = result.assets;
  if (!assets.length || assets.some(asset => !allowedExtensions.test(asset.name))) throw new Error('Escolha apenas documentos PDF, DOCX ou TXT.');
  if (assets.length > 10) throw new Error('Selecione no máximo 10 documentos por versão.');
  if (assets.some(asset => asset.size === 0 || (asset.size !== undefined && asset.size > maxBytes))) throw new Error('Cada documento deve ter entre 1 byte e 5 MB.');
  if (assets.reduce((total, asset) => total + (asset.size || 0), 0) > 20 * 1024 * 1024) throw new Error('Os documentos devem ter no máximo 20 MB no total.');
  return assets;
}

export async function uploadTranslation(serviceId: string, assets: DocumentPicker.DocumentPickerAsset[], token: string) {
  const body = new FormData();
  for (const asset of assets) {
    if (Platform.OS === 'web') {
      if (!asset.file) throw new Error('O navegador não disponibilizou um dos documentos selecionados. Tente novamente.');
      body.append('files', asset.file, asset.name);
    } else {
      body.append('files', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as unknown as Blob);
    }
  }
  return api<Delivery>(`/tasks/${encodeURIComponent(serviceId)}/deliveries`, { method: 'POST', body }, token);
}

export function getDeliveries(token: string) {
  return api<Delivery[]>('/deliveries', {}, token);
}

export function reviewDelivery(deliveryId: string, decision: 'approve' | 'request_revision', feedback: string, token: string) {
  return api<Delivery>(`/deliveries/${encodeURIComponent(deliveryId)}/review`, {
    method: 'POST', body: JSON.stringify({ decision, feedback }),
  }, token);
}

export function downloadOriginal(taskId: string, index: number, name: string, token: string) {
  return downloadProtectedDocument(`/tasks/${encodeURIComponent(taskId)}/attachments/${index}`, name, token);
}

export function downloadDelivery(deliveryId: string, name: string, token: string, fileIndex?: number) {
  const path = fileIndex === undefined
    ? `/deliveries/${encodeURIComponent(deliveryId)}/file`
    : `/deliveries/${encodeURIComponent(deliveryId)}/files/${fileIndex}`;
  return downloadProtectedDocument(path, name, token);
}

export function downloadDemoDocument(name: string) {
  if (Platform.OS !== 'web') return;
  const content = `Echo Ring · documento demonstrativo\n\nArquivo: ${name}\nEste conteúdo existe apenas para visualizar o fluxo local de avaliação e entrega.`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function formatBytes(size?: number) {
  if (size === undefined) return 'Tamanho não informado';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
