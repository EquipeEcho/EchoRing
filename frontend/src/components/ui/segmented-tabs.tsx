import { Pressable, ScrollView, type StyleProp, View, type ViewStyle } from 'react-native';

import { Txt } from '@/components/ui/text';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { radius, spacing, typeScale } from '@/theme/tokens';

export type SegmentedTabItem<T extends string> = {
  value: T;
  label: string;
  /** Rendered as "Label (count)", which is also the tab's accessible name. */
  count?: number;
};

/**
 * Shared tab group: a recessed track with the selected tab raised above it.
 * Use `scrollable` for long lists on narrow screens and `fill` to spread tabs across the row.
 */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  scrollable = false,
  fill = false,
  disabled = false,
  style,
}: {
  items: SegmentedTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  scrollable?: boolean;
  fill?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const tabs = items.map((item) => {
    const selected = item.value === value;
    return (
      <Pressable
        key={item.value}
        accessibilityRole="tab"
        aria-selected={selected}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={() => onChange(item.value)}
        style={({ hovered, pressed }) => [
          styles.tab,
          fill && styles.tabFill,
          hovered && !selected && styles.tabHover,
          selected && styles.tabSelected,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Txt numberOfLines={1} style={[styles.text, selected && styles.textSelected]}>
          {item.count === undefined ? item.label : `${item.label} (${item.count})`}
        </Txt>
      </Pressable>
    );
  });
  if (scrollable) {
    return (
      <ScrollView
        horizontal
        accessibilityRole="tablist"
        accessibilityLabel={label}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={[styles.scroll, style]}
        contentContainerStyle={styles.track}
      >
        {tabs}
      </ScrollView>
    );
  }
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[styles.track, styles.wrap, fill && styles.trackFill, style]}
    >
      {tabs}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  scroll: { flexGrow: 0, alignSelf: 'flex-start', maxWidth: '100%' },
  track: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.sunken,
  },
  wrap: { flexWrap: 'wrap', alignSelf: 'flex-start', maxWidth: '100%' },
  trackFill: { alignSelf: 'stretch' },
  tab: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabFill: { flexGrow: 1 },
  tabHover: { backgroundColor: colors.elevated },
  tabSelected: { backgroundColor: colors.raised, boxShadow: colors.raisedShadow },
  text: { ...typeScale.label, color: colors.muted, fontWeight: '500' },
  textSelected: { color: colors.ink, fontWeight: '600' },
}));
