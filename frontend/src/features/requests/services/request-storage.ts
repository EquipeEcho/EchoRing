import { Platform } from 'react-native';

import { type TranslationRequest } from '@/features/requests/types';
import { normalizeRequests } from './normalize-request';

const storageKey = 'echoring.translation-requests.v1';

export function localRequests(): TranslationRequest[] {
  if (Platform.OS !== 'web') return [];
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeRequests(parsed) : [];
  } catch {
    return [];
  }
}

export function saveLocal(requests: TranslationRequest[]) {
  if (Platform.OS !== 'web') throw new Error('A prévia local está disponível no navegador.');
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(requests));
  } catch {
    throw new Error(
      'O navegador não conseguiu salvar o pedido. Remova arquivos grandes ou libere espaço e tente novamente.',
    );
  }
  window.dispatchEvent(new Event('echoring:requests'));
}
