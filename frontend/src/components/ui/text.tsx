import { StyleSheet, Text } from 'react-native';

import { fonts, typeScale } from '@/theme/tokens';
import { createThemedStyles } from '@/theme/create-themed-styles';

export function Txt({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  const styles = useStyles();
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

const useStyles = createThemedStyles((colors) => ({
  text: { ...typeScale.body, color: colors.ink, letterSpacing: 0 },
}));
