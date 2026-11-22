import { Check, CirclePause, UserRound } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Txt } from '@/components/ui/text';
import { useTheme } from '@/theme/theme-context';

import { useStyles } from '../styles/workflows.styles';
import { type StageRecord, type StageStatus, type WorkflowTemplate } from '../types';
import { formatDeadline, roleLabels } from '../utils/workflow-utils';

const statusLabels: Record<StageStatus, string> = { completed: 'Concluída', current: 'Em andamento', pending: 'Pendente', blocked: 'Bloqueada' };

export function WorkflowTimeline({ template, records = [] }: { template: WorkflowTemplate; records?: StageRecord[] }) {
  const s = useStyles();
  const { colors } = useTheme();
  return <View style={s.timeline} testID="workflow-timeline">
    {template.stages.map((stage, index) => {
      const record = records.find(item => item.stageId === stage.id);
      const color = record?.status === 'completed' ? colors.green : record?.status === 'current' ? colors.accent : record?.status === 'blocked' ? colors.amber : colors.muted;
      return <View key={stage.id} style={s.timelineRow} testID={`workflow-stage-${stage.id}`}>
        <View style={s.rail}>
          <View style={[s.marker, { borderColor: color, backgroundColor: record?.status === 'completed' ? colors.greenSoft : colors.surface }]}>
            {record?.status === 'completed' ? <Check size={15} color={color} /> : record?.status === 'blocked' ? <CirclePause size={16} color={color} /> : <Txt style={{ color, fontSize: 12 }}>{index + 1}</Txt>}
          </View>
          {index < template.stages.length - 1 && <View style={s.connector} />}
        </View>
        <View style={s.stageBody}>
          <View style={s.between}>
            <Txt accessibilityRole="header" style={s.stageTitle}>{stage.title}</Txt>
            {record && <Txt style={{ color, fontSize: 12, fontWeight: '600' }}>{statusLabels[record.status]}</Txt>}
          </View>
          <View style={s.row}>
            <Badge tone={stage.role === 'translator' ? 'blue' : stage.role === 'reviewer' ? 'amber' : 'neutral'}>{roleLabels[stage.role]}</Badge>
            {record && <View style={s.row}><UserRound size={13} color={colors.muted} /><Txt style={s.muted}>{record.assignee}</Txt></View>}
          </View>
          <Txt style={s.muted}>{stage.description}</Txt>
          <View style={s.stageDetail}>
            <Txt style={s.detailLabel}>Requisitos</Txt>
            {stage.requirements.map(text => <Txt key={text} style={s.muted}>• {text}</Txt>)}
            <Txt style={[s.detailLabel, { marginTop: 6 }]}>Entregáveis esperados</Txt>
            {stage.deliverables.map(text => <Txt key={text} style={s.muted}>• {text}</Txt>)}
          </View>
          {record?.completedAt && <Txt style={s.muted}>Concluída em {formatDeadline(record.completedAt)}</Txt>}
          {!!record?.note && <Txt style={s.muted}>Observação: {record.note}</Txt>}
          {!!record?.completedBy && <Txt style={s.muted}>Conclusão registrada por {record.completedBy}</Txt>}
          {record?.deadline && <Txt style={s.muted}>Prazo da etapa: {formatDeadline(record.deadline)}</Txt>}
        </View>
      </View>;
    })}
  </View>;
}

export function ResponsibilityLegend() {
  const s = useStyles();
  return <View style={s.legend}>
    <Txt style={s.detailLabel}>Quem faz cada etapa</Txt>
    <View style={s.row}>
      <Badge tone="blue">Tradutor</Badge><Badge tone="amber">Revisor / QA</Badge><Badge tone="neutral">Funcionário</Badge>
    </View>
    <Txt style={s.muted}>O tradutor executa as etapas linguísticas atribuídas a ele. Revisores verificam a qualidade; funcionários coordenam preparação, aprovações e entrega.</Txt>
  </View>;
}
