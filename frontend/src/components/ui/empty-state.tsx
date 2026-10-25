import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon size={25} color={colors.muted} strokeWidth={1.5} />
      </View>
      <Txt style={styles.emptyTitle}>{title}</Txt>
      <Txt style={styles.emptyText}>{text}</Txt>
      {action && <View style={{ marginTop: 8 }}>{action}</View>}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  empty: { paddingVertical: 44, paddingHorizontal: 22, alignItems: 'center', gap: 10 },
  emptyIcon: {
    width: 56,
    height: 56,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontWeight: '600', fontSize: 17, lineHeight: 25, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: colors.muted, maxWidth: 380, fontSize: 14, lineHeight: 22 },
}));
