import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { palettes, type ThemeColors, type ThemeMode } from '@/theme/tokens';

export const themeStorageKey = 'echoring.theme.v1';

type ThemeContextValue = {
  theme: ThemeMode;
  colors: ThemeColors;
  ready: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function validTheme(value: string | null): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

function initialTheme(): ThemeMode {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return validTheme(window.localStorage.getItem(themeStorageKey));
    }
  } catch {
    // Private browsing or storage restrictions must not prevent using the app.
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [ready, setReady] = useState(Platform.OS === 'web');
  const colors = palettes[theme];

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    SecureStore.getItemAsync(themeStorageKey)
      .then((value) => {
        if (active) setTheme(validTheme(value));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (Platform.OS === 'web') {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      try {
        window.localStorage.setItem(themeStorageKey, theme);
      } catch {
        // Switching themes still works when persistence is unavailable.
      }
    } else {
      SecureStore.setItemAsync(themeStorageKey, theme).catch(() => {});
      SystemUI.setBackgroundColorAsync(colors.canvas).catch(() => {});
    }
  }, [theme, ready, colors]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function syncTheme(event: StorageEvent) {
      if (event.key === themeStorageKey || event.key === null) {
        setTheme(validTheme(event.newValue));
      }
    }
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, colors, ready, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
