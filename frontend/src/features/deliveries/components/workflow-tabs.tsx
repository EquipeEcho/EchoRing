import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/deliveries/styles/deliveries.styles';

export function WorkflowTabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: string; count: number }[];
}) {
  const styles = useStyles();
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.value}
          accessibilityRole="tab"
          aria-selected={value === tab.value}
          accessibilityState={{ selected: value === tab.value }}
          onPress={() => onChange(tab.value)}
          style={[styles.tab, value === tab.value && styles.tabActive]}
        >
          <Txt style={[styles.tabText, value === tab.value && styles.tabTextActive]}>
            {tab.label} ({tab.count})
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
