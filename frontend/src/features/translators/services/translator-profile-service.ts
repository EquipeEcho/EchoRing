import { type TranslatorProfile, type TranslatorProfileRecord } from '@/features/translators/types';
import { api } from '@/lib/api/client';
import { normalizeProfileRecord } from './normalize-profile';

export async function readTranslatorProfile(token: string, translatorId?: string) {
  return normalizeProfileRecord(await api<TranslatorProfileRecord>(`/translator-profile/${translatorId ? encodeURIComponent(translatorId) : 'me'}`, {}, token));
}

export async function saveTranslatorProfile(profile: TranslatorProfile, token: string, complete = false) {
  return normalizeProfileRecord(await api<TranslatorProfileRecord>('/translator-profile/me', {
    method: complete ? 'PUT' : 'PATCH', body: JSON.stringify(profile),
  }, token));
}
