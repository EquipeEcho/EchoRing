import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/deliveries/styles/deliveries.styles';
import { type TranslationService } from '@/features/deliveries/types';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function TaskFeedback({ task }: { task: TranslationService }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
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
