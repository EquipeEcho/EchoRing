import { Clock3, Download, FileText } from 'lucide-react-native';
import { useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { WorkflowMap } from '@/features/workflows/components/workflow-map';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { TaskFeedback } from '@/features/deliveries/components/task-feedback';
import { downloadOriginal } from '@/features/deliveries/services/delivery-service';
import { useStyles } from '@/features/deliveries/styles/deliveries.styles';
import { type TranslationService } from '@/features/deliveries/types';
import { useCommonStyles } from '@/theme/common.styles';
import { formatBytes, money } from '@/utils/formatters';
import { useTheme } from '@/theme/theme-context';

export function TaskDetails({ task, token }: { task: TranslationService; token: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  return (
    <>
      <View style={styles.metadata}>
        {task.compensation != null && <Txt style={{ color: colors.green, fontWeight: '600' }}>Remuneração: {money(task.compensation)}</Txt>}
        <View style={common.row}>
          <Clock3 size={15} color={colors.muted} />
          <Txt style={common.caption}>Prazo: {task.deadline || 'Não informado'}</Txt>
        </View>
        <Txt style={common.caption}>
          {task.source} → {task.target}
        </Txt>
        <Txt style={common.caption}>
          {task.lastVersion ? `Última versão: ${task.lastVersion}` : 'Nenhuma versão enviada'}
        </Txt>
      </View>
      {!!task.observations && (
        <View style={styles.note}>
          <Txt style={styles.eyebrow}>OBSERVAÇÕES</Txt>
          <Txt style={common.caption}>{task.observations}</Txt>
        </View>
      )}
      {!!task.attachments.length && (
        <View style={styles.documents}>
          <Txt style={styles.eyebrow}>DOCUMENTOS ORIGINAIS</Txt>
          {task.attachments.map((file, index) => (
            <View key={`${file.name}-${index}`} style={[styles.document, width < 600 && styles.documentSmall]}>
              <FileText size={18} color={colors.accent} />
              <View style={[styles.documentCopy, width < 600 && styles.documentCopySmall]}>
                <Txt numberOfLines={1}>{file.name}</Txt>
                <Txt style={common.caption}>{formatBytes(file.size)}</Txt>
              </View>
              <Button
                style={width < 600 && styles.documentActionSmall}
                variant="ghost"
                icon={Download}
                onPress={() => void downloadOriginal(task.id, index, file.name, token)}
              >
                Baixar
              </Button>
            </View>
          ))}
        </View>
      )}
      <TaskFeedback task={task} />
      {task.workflow && <WorkflowMap template={task.workflow.definition} records={task.workflow.stages} />}
      <Button variant="secondary" onPress={() => router.push({ pathname: '/workflows', params: { task: task.id } })}>Acompanhar workflow</Button>
    </>
  );
}
