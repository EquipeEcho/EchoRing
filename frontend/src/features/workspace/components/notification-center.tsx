import { router } from 'expo-router';
import { Bell, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Txt } from '@/components/ui/text';
import { type NotificationItem } from '@/features/workspace/utils/notification-items';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing, typeScale } from '@/theme/tokens';

/** Notification panel; each item opens the screen that resolves it. */
export function NotificationCenter({ open, onClose, items, demo, error, allRead, onRead, onMarkAllRead }: {
  open: boolean;
  onClose: () => void;
  items: NotificationItem[];
  demo: boolean;
  error: string;
  /** Local "read" state for the situational items; offer notifications keep their own. */
  allRead: boolean;
  onRead: (item: NotificationItem) => void;
  onMarkAllRead: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  function openItem(item: NotificationItem) {
    onRead(item);
    onClose();
    router.push(item.href);
  }
  const unread = items.some(item => item.offerId ? item.unread : item.unread && !allRead);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      mobileSheet
      eyebrow="CENTRAL DE ATUALIZAÇÕES"
      title="Notificações"
      description="Toque em um aviso para abrir a tela correspondente."
    >
      {demo && <Badge tone="neutral">Dados demonstrativos</Badge>}
      {!!error && <Txt accessibilityRole="alert" style={{ color: colors.red }}>{error}</Txt>}
      <View role="list" accessibilityLabel="Notificações" style={styles.list}>
        {items.map(item => {
          const isUnread = item.offerId ? item.unread : item.unread && !allRead;
          return (
            <View key={item.key} role="listitem">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.text}`}
                accessibilityHint="Abre a tela relacionada"
                onPress={() => openItem(item)}
                style={({ hovered, pressed }) => [styles.item, (hovered || pressed) && styles.itemHover]}
              >
                <View style={[styles.dot, isUnread && styles.dotUnread]} />
                <View style={styles.copy}>
                  <Txt style={[styles.title, !isUnread && styles.titleRead]}>{item.title}</Txt>
                  <Txt style={styles.text}>{item.text}</Txt>
                  <Txt style={styles.meta}>{item.meta}</Txt>
                </View>
                <ChevronRight size={18} color={colors.muted} />
              </Pressable>
            </View>
          );
        })}
      </View>
      {!items.length && !error && (
        <EmptyState icon={Bell} title="Tudo em dia" text="Não há novas pendências nos dados carregados. Consulte Projetos e Tarefas para acompanhar sua rotina." />
      )}
      <Button variant="secondary" onPress={onMarkAllRead} disabled={!unread}>
        {unread ? 'Marcar todas como lidas' : 'Todas as notificações lidas'}
      </Button>
    </Dialog>
  );
}

const useStyles = createThemedStyles((colors) => ({
  list: { gap: spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
  },
  itemHover: { backgroundColor: colors.elevated },
  dot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'flex-start', marginTop: 6 },
  dotUnread: { backgroundColor: colors.accent },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { ...typeScale.label, fontWeight: '600', color: colors.ink },
  titleRead: { fontWeight: '500', color: colors.muted },
  text: { ...typeScale.caption, color: colors.muted },
  meta: { fontSize: 12, lineHeight: 16, color: colors.muted },
}));
