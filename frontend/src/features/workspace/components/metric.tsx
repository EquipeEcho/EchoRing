import { type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/workspace/styles/workspace.styles';

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
  const styles = useStyles();
  return (
    <View style={[styles.metric, compact && styles.metricCompact]}>
      <View style={[styles.metricIcon, { borderColor: color }]}>
        <Icon size={19} color={color} strokeWidth={1.8} />
      </View>
      <View style={styles.metricCopy}>
        <Txt style={[styles.metricValue, { color }, compact && { fontSize: 26, lineHeight: 32 }]}>{value}</Txt>
        <Txt style={[styles.metricLabel, compact && { fontSize: 13, lineHeight: 20 }]}>{title}</Txt>
      </View>
    </View>
  );
}
