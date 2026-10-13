import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { type Delivery, type TranslationService } from '@/features/deliveries/types';
import { api } from '@/lib/api/client';
import { downloadProtectedDocument } from '@/lib/documents/download';

export async function getAssignedServices(token: string) {
  return api<TranslationService[]>('/tasks', {}, token);
}

export function getTask(taskId: string, token: string) {
  return api<TranslationService>(`/tasks/${encodeURIComponent(taskId)}`, {}, token);
}

export function startTask(taskId: string, token: string) {
  return api<TranslationService>(
    `/tasks/${encodeURIComponent(taskId)}/start`,
    { method: 'POST' },
    token,
  );
}

export async function uploadTranslation(
  serviceId: string,
  assets: DocumentPicker.DocumentPickerAsset[],
  token: string,
) {
  const body = new FormData();
  for (const asset of assets) {
    if (Platform.OS === 'web') {
      if (!asset.file)
        throw new Error(
          'O navegador não disponibilizou um dos documentos selecionados. Tente novamente.',
        );
      body.append('files', asset.file, asset.name);
    } else {
      body.append('files', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as unknown as Blob);
    }
  }
  return api<Delivery>(
    `/tasks/${encodeURIComponent(serviceId)}/deliveries`,
    { method: 'POST', body },
    token,
  );
}

export function getDeliveries(token: string) {
  return api<Delivery[]>('/deliveries', {}, token);
}

export function reviewDelivery(
  deliveryId: string,
  decision: 'approve' | 'request_revision',
  feedback: string,
  token: string,
) {
  return api<Delivery>(
    `/deliveries/${encodeURIComponent(deliveryId)}/review`,
    {
      method: 'POST',
      body: JSON.stringify({ decision, feedback }),
    },
    token,
  );
}

export function downloadOriginal(taskId: string, index: number, name: string, token: string) {
  return downloadProtectedDocument(
    `/tasks/${encodeURIComponent(taskId)}/attachments/${index}`,
    name,
    token,
  );
}

export function downloadDelivery(
  deliveryId: string,
  name: string,
  token: string,
  fileIndex?: number,
) {
  const path =
    fileIndex === undefined
      ? `/deliveries/${encodeURIComponent(deliveryId)}/file`
      : `/deliveries/${encodeURIComponent(deliveryId)}/files/${fileIndex}`;
  return downloadProtectedDocument(path, name, token);
}
