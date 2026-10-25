import { Pressable } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { useTheme } from '@/theme/theme-context';

export function FilterTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="tab"
      aria-selected={active}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ hovered }) => [styles.tab, active && styles.tabActive, hovered && !active && { backgroundColor: colors.surface }]}
    >
      <Txt style={[styles.tabText, active && { color: colors.accent, fontWeight: '600' }]}>
        {label}
      </Txt>
    </Pressable>
  );
}
