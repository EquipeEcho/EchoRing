import { type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { typeScale } from '@/theme/tokens';
import { createThemedStyles } from '@/theme/create-themed-styles';

export function PageHeading({
  title,
  subtitle,
  action,
  spacing = 'default',
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  spacing?: 'default' | 'flush';
}) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.heading, spacing === 'flush' && { marginBottom: 0 }]}>
      <View style={styles.headingCopy}>
        <Txt
          accessibilityRole="header"
          style={[styles.title, width < 700 && { fontSize: 28, lineHeight: 36, letterSpacing: -0.8 }]}
        >
          {title}
        </Txt>
        <Txt style={styles.subtitle}>{subtitle}</Txt>
      </View>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  headingCopy: { flex: 1, minWidth: 200, gap: 8 },
  action: { flexShrink: 1, maxWidth: '100%' },
  title: { ...typeScale.title, fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -1.1 },
  subtitle: { fontSize: 15, lineHeight: 24, color: colors.muted, maxWidth: 640 },
}));
