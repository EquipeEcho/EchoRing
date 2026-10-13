import { FileCheck2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Txt } from '@/components/ui/text';
import { statusTone } from '@/features/deliveries/constants';
import { styles } from '@/features/deliveries/styles/deliveries.styles';
import { type TranslationService } from '@/features/deliveries/types';
import { common } from '@/theme/common.styles';
import { colors } from '@/theme/tokens';

export function TaskHeader({ task }: { task: TranslationService }) {
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
