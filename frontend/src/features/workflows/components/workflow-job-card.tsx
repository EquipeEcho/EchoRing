import { CalendarDays, UserRound } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { useTheme } from '@/theme/theme-context';

import { useStyles } from '../styles/workflows.styles';
import { type WorkflowJob } from '../types';
import { formatDeadline, isOverdue, roleLabels, templateFor, trackingStatus } from '../utils/workflow-utils';
import { WorkflowProgress } from './workflow-progress';
import { WorkflowMap } from './workflow-map';

export function WorkflowStatusBadge({ job, now }: { job: WorkflowJob; now: number }) {
  const status = trackingStatus(job, now);
  return <Badge tone={status === 'Concluído' ? 'green' : ['Bloqueado', 'Atrasado'].includes(status) ? 'red' : status === 'Requer atenção' ? 'amber' : status === 'Em andamento' ? 'blue' : 'neutral'}>{status}</Badge>;
}

export function WorkflowJobCard({ job, now, compact, onOpen }: { job: WorkflowJob; now: number; compact: boolean; onOpen: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const template = templateFor(job);
  const current = job.stages.find(stage => ['current', 'blocked'].includes(stage.status));
  const stage = template?.stages.find(item => item.id === current?.stageId);
  return <View testID={`workflow-job-${job.id}`} style={[s.card, compact && s.cardCompact]}>
    <View style={s.between}><Txt style={s.eyebrow}>{job.id}</Txt><WorkflowStatusBadge job={job} now={now} /></View>
    <View style={s.cardTop}>
      <Txt accessibilityRole="header" style={s.title}>{job.title}</Txt>
      <Txt style={s.muted}>{job.client} · {job.languages}</Txt>
      <View style={s.row}><Badge tone="neutral">{job.source === 'demo' ? 'Exemplo fictício' : 'Serviço real'}</Badge>{template && <Badge tone="blue">{template.shortTitle}</Badge>}</View>
    </View>
    <View style={s.metadata}>
      <View style={s.row}><UserRound size={14} color={colors.muted} /><Txt style={s.muted}>{job.translator?.name || 'Tradutor não informado'}</Txt></View>
      <View style={s.row}><CalendarDays size={14} color={colors.muted} /><Txt style={[s.muted, isOverdue(job, now) && { color: colors.red }]}>Prazo: {formatDeadline(job.deadline)}{isOverdue(job, now) ? ' · Atrasado' : ''}</Txt></View>
      {job.serviceStatus && <Txt style={s.muted}>Status do serviço: {job.serviceStatus}</Txt>}
    </View>
    <WorkflowProgress job={job} />
    {template && <WorkflowMap template={template} records={job.stages} mini />}
    {stage && current && <View style={{ gap: 4 }}><Txt style={s.detailLabel}>Etapa atual: {stage.title}</Txt><Txt style={s.muted}>{current.assignee} · {roleLabels[stage.role]}</Txt></View>}
    {(job.blocker || job.attention) && <View style={s.alert}><Txt style={s.alertText}>{job.blocker ? 'Bloqueio: ' : 'Atenção: '}{job.blocker || job.attention}</Txt></View>}
    <View style={{ flex: 1 }} />
    <Button variant="secondary" onPress={onOpen}>Ver detalhes</Button>
  </View>;
}
