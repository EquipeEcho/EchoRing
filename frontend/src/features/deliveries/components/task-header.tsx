import { FileCheck2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Txt } from '@/components/ui/text';
import { statusTone } from '@/features/deliveries/constants';
import { useStyles } from '@/features/deliveries/styles/deliveries.styles';
import { type TranslationService } from '@/features/deliveries/types';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function TaskHeader({ task }: { task: TranslationService }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  return (
    <View style={styles.cardHeader}>
      <View style={styles.fileIcon}>
        <FileCheck2 size={24} color={colors.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Txt style={styles.title}>{task.title}</Txt>
        <Txt style={common.caption}>
          {task.id}
          {task.requestId ? ` · ${task.requestId}` : ''}
        </Txt>
      </View>
      <Badge tone={statusTone[task.status]}>{task.status}</Badge>
    </View>
  );
}
