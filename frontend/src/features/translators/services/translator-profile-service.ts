import { type TranslatorProfile, type TranslatorProfileRecord } from '@/features/translators/types';
import { api } from '@/lib/api/client';

export function readTranslatorProfile(token: string) {
  return api<TranslatorProfileRecord>('/translator-profile/me', {}, token);
}

export function saveTranslatorProfile(profile: TranslatorProfile, token: string, complete = false) {
  return api<TranslatorProfileRecord>('/translator-profile/me', {
    method: complete ? 'PUT' : 'PATCH', body: JSON.stringify(profile),
  }, token);
}
