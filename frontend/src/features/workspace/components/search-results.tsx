import { type Href, router } from 'expo-router';
import { ChevronRight, FileText, FolderKanban, ListTodo, type LucideIcon } from 'lucide-react-native';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Txt } from '@/components/ui/text';
import { type SearchGroup } from '@/features/workspace/hooks/use-global-search';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';
import { radius, spacing, typeScale } from '@/theme/tokens';

const groupIcon: Record<SearchGroup['key'], LucideIcon> = { solicitacoes: FileText, projetos: FolderKanban, tarefas: ListTodo };

/** Grouped header search results; picking one opens its screen and closes the panel. */
export function SearchResults({ query, groups, loading, onSelect, style }: {
  query: string;
  groups: SearchGroup[];
  loading: boolean;
  onSelect: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const open = (href: Href) => {
    onSelect();
    router.push(href);
  };
  const empty = !loading && !groups.length;
  return (
    <View accessibilityLabel={`Resultados da busca por ${query.trim()}`} style={[styles.panel, style]}>
      {loading && !groups.length && <Txt style={styles.status}>Buscando…</Txt>}
      {empty && <Txt accessibilityLiveRegion="polite" style={styles.status}>Nada encontrado para “{query.trim()}”.</Txt>}
      {groups.map(group => {
        const Icon = groupIcon[group.key];
        return (
          <View key={group.key} role="list" accessibilityLabel={group.label} style={styles.group}>
            <View style={styles.groupHeading}>
              <Icon size={14} color={colors.muted} />
              <Txt style={styles.groupLabel}>{group.label}</Txt>
            </View>
            {group.results.map(result => (
              <View key={result.key} role="listitem">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${result.title}. ${result.detail}`}
                  onPress={() => open(result.href)}
                  style={({ hovered, pressed }) => [styles.result, (hovered || pressed) && styles.resultHover]}
                >
                  <View style={styles.copy}>
                    <Txt numberOfLines={1} style={styles.title}>{result.title}</Txt>
                    <Txt numberOfLines={1} style={styles.detail}>{result.detail}</Txt>
                  </View>
                  {!!result.status && <Badge dot tone={result.tone ?? 'neutral'}>{result.status}</Badge>}
                </Pressable>
              </View>
            ))}
            {!!group.more && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver todos os resultados em ${group.label}`}
                onPress={() => open(group.more!)}
                style={({ hovered }) => [styles.more, hovered && styles.resultHover]}
              >
                <Txt style={styles.moreText}>Ver todos em {group.label}</Txt>
                <ChevronRight size={14} color={colors.muted} />
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  panel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 50,
    marginTop: 6,
    maxHeight: 460,
    overflow: 'scroll',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    boxShadow: colors.cardShadow,
  },
  status: { ...typeScale.caption, color: colors.muted, padding: spacing.sm },
  group: { gap: 2 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingTop: 4, paddingBottom: 2 },
  groupLabel: { ...typeScale.eyebrow, fontWeight: '600', color: colors.muted, textTransform: 'uppercase' },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.sm },
  resultHover: { backgroundColor: colors.elevated },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  title: { ...typeScale.label, fontWeight: '600', color: colors.ink },
  detail: { ...typeScale.caption, color: colors.muted },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm },
  moreText: { ...typeScale.caption, color: colors.ink, fontWeight: '600' },
}));
