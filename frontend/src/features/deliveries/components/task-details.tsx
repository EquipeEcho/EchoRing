import { Clock3, Download, FileText } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { TaskFeedback } from '@/features/deliveries/components/task-feedback';
import { downloadOriginal } from '@/features/deliveries/services/delivery-service';
import { styles } from '@/features/deliveries/styles/deliveries.styles';
import { type TranslationService } from '@/features/deliveries/types';
import { common } from '@/theme/common.styles';
import { colors } from '@/theme/tokens';
import { formatBytes } from '@/utils/formatters';

export function TaskDetails({ task, token }: { task: TranslationService; token: string }) {
  return (
    <>
      <View style={styles.metadata}>
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
            <View key={`${file.name}-${index}`} style={styles.document}>
              <FileText size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={1}>{file.name}</Txt>
                <Txt style={common.caption}>{formatBytes(file.size)}</Txt>
              </View>
              <Button
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
    </>
  );
}
