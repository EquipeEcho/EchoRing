import { type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { typeScale } from '@/theme/tokens';
import { createThemedStyles } from '@/theme/create-themed-styles';

export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  return (
    <View style={styles.heading}>
      <View style={styles.headingCopy}>
        <View style={styles.headingRule} />
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
  headingCopy: { flex: 1, minWidth: 220, gap: 8 },
  action: { flexShrink: 1 },
  headingRule: {
    width: 34,
    height: 3,
    marginBottom: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  title: { ...typeScale.title, fontSize: 34, lineHeight: 42, fontWeight: '700', letterSpacing: -1.1 },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.muted, maxWidth: 640 },
}));
