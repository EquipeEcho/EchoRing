import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { colors, typeScale } from '@/theme/tokens';

export function Badge({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'neutral';
}) {
  const tones = {
    green: [colors.green, colors.greenSoft],
    amber: [colors.amber, colors.amberSoft],
    red: [colors.red, colors.redSoft],
    blue: [colors.blue, colors.blueSoft],
    neutral: [colors.muted, colors.canvas],
  };
  return (
    <View style={[styles.badge, { backgroundColor: tones[tone][1] }]}>
      <Txt style={{ ...typeScale.caption, fontWeight: '600', color: tones[tone][0] }}>
        {children}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
});
