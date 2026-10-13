import { type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { styles } from '@/features/workspace/styles/workspace.styles';

export function Metric({
  title,
  value,
  color,
  icon: Icon,
  compact,
}: {
  title: string;
  value: number;
  color: string;
  icon: LucideIcon;
  compact: boolean;
}) {
  return (
    <View style={[styles.metric, compact && styles.metricCompact]}>
      <View style={[styles.metricIcon, { borderColor: color }]}>
        <Icon size={19} color={color} strokeWidth={1.8} />
      </View>
      <View style={styles.metricCopy}>
        <Txt style={[styles.metricValue, { color }]}>{value}</Txt>
        <Txt style={styles.metricLabel}>{title}</Txt>
      </View>
    </View>
  );
}
