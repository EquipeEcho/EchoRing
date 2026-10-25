import { FileCheck2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { statusTone } from '@/features/deliveries/constants';
import { useStyles } from '@/features/deliveries/styles/deliveries.styles';
import { type TranslationService } from '@/features/deliveries/types';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function TaskHeader({ task }: { task: TranslationService }) {
  const { session } = useSession();
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  return (
    <View style={styles.cardHeader}>
      <View style={styles.fileIcon}>
        <FileCheck2 size={24} color={colors.accent} />
      </View>
      <View style={[{ flex: 1, minWidth: 0, gap: 5 }, width < 600 && styles.headerCopySmall]}>
        <Txt style={styles.title}>{task.title}</Txt>
        <Txt style={common.caption}>
          {task.id}
          {task.requestId ? ` · ${task.requestId}` : ''}
        </Txt>
        {task.translator && session?.role !== 'translator' && <Pressable accessibilityRole="link" accessibilityLabel={`Ver perfil de ${task.translator.name}`} onPress={() => router.push({ pathname: '/tradutores/[id]', params: { id: task.translator!.id } })}>
          <Txt style={{ color: colors.accent, fontSize: 12, lineHeight: 20 }}>{task.translator.name} · Ver perfil</Txt>
        </Pressable>}
      </View>
      <Badge tone={statusTone[task.status]}>{task.status}</Badge>
    </View>
  );
}
