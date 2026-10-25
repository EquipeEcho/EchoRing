import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Txt } from '@/components/ui/text';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';
import { radius } from '@/theme/tokens';

export function Button({
  children,
  onPress,
  icon: Icon,
  variant = 'primary',
  disabled,
  loading,
  style,
  testID,
}: {
  children: ReactNode;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const primary = variant === 'primary';
  const foreground = primary ? colors.onAccent : variant === 'secondary' ? colors.ink : colors.accent;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      aria-disabled={disabled || loading}
      aria-busy={loading}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.button,
        primary ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost,
        hovered && !disabled && !loading && { backgroundColor: primary ? colors.accentStrong : colors.elevated, borderColor: primary ? colors.accentStrong : variant === 'secondary' ? colors.controlLine : 'transparent' },
        pressed && { opacity: 0.8 },
        (disabled || loading) && { opacity: 0.65 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        Icon && <Icon size={17} color={foreground} />
      )}
      <Txt style={[styles.buttonText, { color: foreground }]}>
        {children}
      </Txt>
    </Pressable>
  );
}

const useStyles = createThemedStyles((colors) => ({
  button: {
    minHeight: 48,
    maxWidth: '100%',
    borderRadius: radius.control,
    paddingHorizontal: 20,
    paddingVertical: 11,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderColor: colors.line },
  ghost: { borderColor: 'transparent', backgroundColor: 'transparent' },
  buttonText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
}));
