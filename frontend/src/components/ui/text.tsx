import { StyleSheet, Text } from 'react-native';

import { colors, fonts, typeScale } from '@/theme/tokens';

export function Txt({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  const resolved = StyleSheet.flatten(style);
  const weight = resolved?.fontWeight;
  const family =
    weight === 'bold' || Number(weight) >= 700
      ? fonts.bold
      : Number(weight) >= 600
        ? fonts.semibold
        : Number(weight) >= 500
          ? fonts.medium
          : fonts.regular;
  // Each bundled weight has its own family name on both web and native.
  return (
    <Text
      {...props}
      style={[
        styles.text,
        style,
        { fontFamily: resolved?.fontFamily ?? family, fontWeight: 'normal' },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { ...typeScale.body, color: colors.ink, letterSpacing: 0 },
});
