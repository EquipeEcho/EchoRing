import { Moon, Sun } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme, colors } = useTheme();
  const styles = useStyles();
  const light = theme === 'light';
  const label = light ? 'Ativar modo escuro' : 'Ativar modo claro';
  const Icon = light ? Moon : Sun;
  return (
    <Pressable
      testID="theme-toggle"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Altera o tema de todas as páginas e salva sua preferência."
      onPress={toggleTheme}
      style={({ hovered, pressed }) => [
        styles.button,
        hovered && { backgroundColor: colors.accentSoft, borderColor: colors.accent },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Icon size={20} color={colors.ink} strokeWidth={1.8} />
    </Pressable>
  );
}

const useStyles = createThemedStyles((colors) => ({
  button: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
