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
          style={[styles.title, width < 700 && { fontSize: 34, lineHeight: 42 }]}
        >
          {title}
        </Txt>
        <Txt style={styles.subtitle}>{subtitle}</Txt>
      </View>
      {action}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  headingCopy: { flex: 1, minWidth: 180, gap: 7 },
  headingRule: {
    width: 34,
    height: 3,
    marginBottom: 7,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  title: { ...typeScale.title, fontWeight: '700', letterSpacing: -1.7 },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.muted },
}));
