import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { colors } from '@/theme/tokens';

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
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon size={27} color={colors.accent} strokeWidth={1.5} />
      </View>
      <Txt style={styles.emptyTitle}>{title}</Txt>
      <Txt style={styles.emptyText}>{text}</Txt>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 56, paddingHorizontal: 22, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    backgroundColor: colors.accentSoft,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontWeight: '600', fontSize: 17, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: colors.muted, maxWidth: 380, fontSize: 13 },
});
