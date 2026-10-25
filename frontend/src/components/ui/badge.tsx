import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { typeScale } from '@/theme/tokens';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';

export function Badge({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'neutral';
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const tones = {
    green: [colors.green, colors.greenSoft],
    amber: [colors.amber, colors.amberSoft],
    red: [colors.red, colors.redSoft],
    blue: [colors.blue, colors.blueSoft],
    neutral: [colors.muted, colors.canvas],
  };
  return (
    <View style={[styles.badge, { backgroundColor: tones[tone][1] }]}>
      <Txt style={{ ...typeScale.caption, fontSize: 12, lineHeight: 18, flexShrink: 1, fontWeight: '600', color: tones[tone][0] }}>
        {children}
      </Txt>
    </View>
  );
}

const useStyles = createThemedStyles(() => ({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
}));
