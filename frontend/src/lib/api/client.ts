import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredBaseURL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);

function resolveBaseURL() {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredBaseURL))
    return configuredBaseURL;
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host && host !== 'localhost' && host !== '127.0.0.1'
      ? configuredBaseURL.replace(/localhost|127\.0\.0\.1/i, host)
      : configuredBaseURL;
  }
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return metroHost
    ? configuredBaseURL.replace(/localhost|127\.0\.0\.1/i, metroHost)
    : configuredBaseURL;
}

export const baseURL = resolveBaseURL();

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const response = await fetch(baseURL + path, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(multipart ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        typeof body?.detail === 'string'
          ? body.detail
          : 'Não foi possível concluir. Confira os dados e tente novamente.',
      );
    return body as T;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError'))
      throw new Error('Não foi possível conectar à empresa. Tente novamente em instantes.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFile(path: string, token: string) {
  const response = await fetch(baseURL + path, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === 'string' ? body.detail : 'Não foi possível baixar o documento.',
    );
  }
  return response.blob();
}
