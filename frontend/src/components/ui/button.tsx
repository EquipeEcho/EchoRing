import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

import { Txt } from '@/components/ui/text';
import { colors } from '@/theme/tokens';

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
  const primary = variant === 'primary';
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
        hovered && { backgroundColor: primary ? colors.accentStrong : colors.accentSoft },
        pressed && { opacity: 0.8 },
        (disabled || loading) && { opacity: 0.65 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={primary ? colors.canvas : colors.accent} />
      ) : (
        Icon && <Icon size={17} color={primary ? colors.canvas : colors.accent} />
      )}
      <Txt style={[styles.buttonText, { color: primary ? colors.canvas : colors.accent }]}>
        {children}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 20,
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
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
});
