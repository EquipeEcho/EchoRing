import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

import { apiFile, baseURL } from '@/lib/api/client';
import { type Attachment } from '@/types/translation';

function safeDownloadName(name: string) {
  return (
    name
      .split(/[\\/]/)
      .pop()
      ?.replace(/[<>:"|?*\u0000-\u001F]/g, '_')
      .trim() || 'documento'
  );
}

function mediaTypeFor(name: string) {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'docx')
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (extension === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

async function shareNativeFile(name: string, content: Uint8Array | string) {
  const safeName = safeDownloadName(name);
  const localFile = new File(Paths.cache, `${Date.now()}-${safeName}`);
  if (typeof content === 'string') localFile.write(content, { encoding: 'base64' });
  else localFile.write(content);
  await Sharing.shareAsync(localFile.uri, {
    mimeType: mediaTypeFor(safeName),
    dialogTitle: `Salvar ${safeName}`,
  });
}

function saveWebFile(content: Blob, name: string) {
  const url = URL.createObjectURL(content);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = safeDownloadName(name);
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function reportDownloadError(failure: unknown) {
  const message = failure instanceof TypeError
    ? 'Não foi possível conectar. Verifique sua conexão e tente novamente.'
    : failure instanceof Error ? failure.message : 'Tente novamente em instantes.';
  if (Platform.OS === 'web') window.alert(`Não foi possível baixar\n\n${message}`);
  else Alert.alert('Não foi possível baixar', message);
}

export async function downloadDocument(file: Attachment) {
  try {
    if (Platform.OS === 'web') {
      const bytes = Uint8Array.from(atob(file.content), (char) => char.charCodeAt(0));
      saveWebFile(new Blob([bytes], { type: mediaTypeFor(file.name) }), file.name);
    } else {
      await shareNativeFile(file.name, file.content);
    }
  } catch (failure) {
    reportDownloadError(failure);
  }
}

export async function downloadProtectedDocument(path: string, name: string, token: string) {
  try {
    if (Platform.OS === 'web') {
      saveWebFile(await apiFile(path, token), name);
      return;
    }
    const response = await fetch(baseURL + path, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(
        typeof body?.detail === 'string' ? body.detail : 'Não foi possível baixar o documento.',
      );
    }
    await shareNativeFile(name, new Uint8Array(await response.arrayBuffer()));
  } catch (failure) {
    reportDownloadError(failure);
  }
}
