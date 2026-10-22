import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useTheme } from '@/theme/theme-context';

import { useStyles } from '../styles/workflows.styles';
import { type WorkflowJob } from '../types';
import { progressFor, templateFor } from '../utils/workflow-utils';

export function WorkflowProgress({ job }: { job: WorkflowJob }) {
  const s = useStyles();
  const { colors } = useTheme();
  const progress = progressFor(job);
  if (progress === null) return <Txt style={s.muted}>Progresso por etapas indisponível</Txt>;
  const completed = templateFor(job)?.stages.filter(stage => job.stages.some(record => record.stageId === stage.id && record.status === 'completed')).length ?? 0;
  return <View style={s.progress}>
    <View style={s.between}>
      <Txt style={s.muted}>{completed} de {templateFor(job)?.stages.length} etapas concluídas</Txt>
      <Txt style={s.progressText}>{progress}%</Txt>
    </View>
    <View accessibilityRole="progressbar" accessibilityLabel={`Progresso de ${job.title}`} accessibilityValue={{ min: 0, max: 100, now: progress }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${completed} de ${templateFor(job)?.stages.length} etapas concluídas`} style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: progress === 100 ? colors.green : colors.accent }]} />
    </View>
  </View>;
}
