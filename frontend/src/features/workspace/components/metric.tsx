import { ArrowUpRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { useTheme } from '@/theme/theme-context';

export function Metric({
  title,
  value,
  color,
  icon: Icon,
  compact,
  context,
  onPress,
}: {
  title: string;
  value: number;
  color: string;
  icon: LucideIcon;
  compact: boolean;
  /** One short line that explains the number, hidden on compact tiles. */
  context?: string;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}: ${value}${context ? `. ${context}` : ''}`}
      accessibilityHint={onPress ? 'Abre a lista de projetos com este filtro.' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.metric,
        compact && styles.metricCompact,
        hovered && styles.metricHover,
        pressed && { opacity: 0.85 },
      ]}
    >
      {({ hovered }) => (
        <>
          <View style={styles.metricTop}>
            <View style={[styles.metricIcon, compact && styles.metricIconCompact]}>
              <Icon size={compact ? 16 : 19} color={color} strokeWidth={1.8} />
            </View>
            {!!onPress && !compact && <ArrowUpRight size={18} color={hovered ? colors.ink : colors.muted} />}
          </View>
          <View style={styles.metricCopy}>
            <Txt style={[styles.metricValue, { color }, compact && styles.metricValueCompact]}>{value}</Txt>
            <Txt numberOfLines={2} style={[styles.metricLabel, compact && styles.metricLabelCompact]}>{title}</Txt>
            {!!context && !compact && <Txt numberOfLines={1} style={styles.metricContext}>{context}</Txt>}
          </View>
        </>
      )}
    </Pressable>
  );
}
