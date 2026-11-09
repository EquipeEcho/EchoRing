import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { radius, typeScale } from '@/theme/tokens';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';

/**
 * Status scale shared by the portal: neutral = draft or information, blue = in progress,
 * amber = waiting on someone, green = done, red = blocked or declined.
 */
export type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'neutral';

export function Badge({
  children,
  tone = 'green',
  dot = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  /** Marks the badge as a status so it reads apart from plain tags. */
  dot?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const tones = {
    green: [colors.green, colors.greenSoft],
    amber: [colors.amber, colors.amberSoft],
    red: [colors.red, colors.redSoft],
    blue: [colors.blue, colors.blueSoft],
    neutral: [colors.muted, colors.elevated],
  };
  const [foreground, background] = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      {dot && <View style={[styles.dot, { backgroundColor: foreground }]} />}
      <Txt style={[styles.text, { color: foreground }]}>{children}</Txt>
    </View>
  );
}

const useStyles = createThemedStyles(() => ({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  text: { ...typeScale.caption, fontSize: 12, lineHeight: 18, flexShrink: 1, fontWeight: '600' },
}));
