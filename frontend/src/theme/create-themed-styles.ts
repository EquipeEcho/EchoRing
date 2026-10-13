import { StyleSheet } from 'react-native';

import { palettes, type ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-context';

type SelectColor = (dark: string, light: string) => string;

// Build each sheet once; the hook updates mounted components without resetting their state.
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors, selectColor: SelectColor) => T,
) {
  const sheets = {
    dark: StyleSheet.create(factory(palettes.dark, (dark) => dark)),
    light: StyleSheet.create(factory(palettes.light, (_, light) => light)),
  };
  return function useThemedStyles() {
    const { theme } = useTheme();
    return sheets[theme];
  };
}
