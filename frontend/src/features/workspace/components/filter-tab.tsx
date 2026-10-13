import { Pressable } from 'react-native';

import { Txt } from '@/components/ui/text';
import { styles } from '@/features/workspace/styles/workspace.styles';
import { colors } from '@/theme/tokens';

export function FilterTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      aria-selected={active}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Txt style={[styles.tabText, active && { color: colors.accent, fontWeight: '600' }]}>
        {label}
      </Txt>
    </Pressable>
  );
}
