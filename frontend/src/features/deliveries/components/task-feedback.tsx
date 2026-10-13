import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { styles } from '@/features/deliveries/styles/deliveries.styles';
import { type TranslationService } from '@/features/deliveries/types';
import { common } from '@/theme/common.styles';
import { colors } from '@/theme/tokens';

export function TaskFeedback({ task }: { task: TranslationService }) {
  if (task.status !== 'Revisão solicitada') return null;
  return (
    <View style={styles.feedback}>
      <Txt style={{ color: colors.amber, fontWeight: '600' }}>Revisão solicitada pela equipe</Txt>
      <Txt style={common.caption}>
        {task.lastFeedback || 'Revise o documento e envie uma nova versão.'}
      </Txt>
    </View>
  );
}
