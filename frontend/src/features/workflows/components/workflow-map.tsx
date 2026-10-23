import { ArrowDown, ArrowRight, ArrowUp, Check, CircleCheck, CirclePlay, ClipboardList, FileSearch, Languages, MonitorCheck, Pause, SearchCheck, Send, ShieldCheck, Sparkles, Stamp, Timer, UsersRound, type LucideIcon } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Txt } from '@/components/ui/text';
import { useTheme } from '@/theme/theme-context';

import { workflowPresentation } from '../data/workflow-presentation';
import { useMapStyles } from '../styles/workflow-map.styles';
import { type StageRecord, type StageStatus, type WorkflowTemplate } from '../types';
import { formatDeadline, roleLabels } from '../utils/workflow-utils';

const icons: Record<string, LucideIcon> = { preparation: ClipboardList, translation: Languages, revision: SearchCheck, qa: ShieldCheck, delivery: Send,
  'post-editing': Sparkles, context: FileSearch, adaptation: Languages, testing: MonitorCheck, approval: CircleCheck,
  analysis: FileSearch, checking: SearchCheck, formalization: Stamp, synchronization: Timer };
const statuses: Record<StageStatus, string> = { completed: 'Concluída', current: 'Em andamento', pending: 'Pendente', blocked: 'Bloqueada' };

export function WorkflowMap({ template, records = [], mini = false, details = true }: {
  template: WorkflowTemplate; records?: StageRecord[]; mini?: boolean; details?: boolean;
}) {
  const s = useMapStyles();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [inspection, setInspection] = useState<{ id: string; signature: string } | null>(null);
  const signature = records.map(record => `${record.stageId}:${record.status}`).join('|');
  const inspected = inspection?.signature === signature ? inspection.id : null;
  const vertical = width > 0 && width < 680;
  const current = records.find(record => record.status === 'current' || record.status === 'blocked');
  const completed = template.stages.filter(stage => records.some(record => record.stageId === stage.id && record.status === 'completed')).length;
  const selected = template.stages.find(stage => stage.id === (inspected || current?.stageId)) || template.stages[completed === template.stages.length ? template.stages.length - 1 : 0];
  const selectedRecord = records.find(record => record.stageId === selected.id);
  const presentation = workflowPresentation[template.id];
  const colorFor = (status?: StageStatus) => status === 'completed' ? colors.green : status === 'current' ? colors.accent : status === 'blocked' ? colors.amber : colors.muted;
  const labelFor = (record?: StageRecord) => record ? statuses[record.status] : 'Modelo de referência';
  if (mini) return <View style={s.mini} testID={`workflow-map-${template.id}`} accessibilityLabel={`Fluxo ${template.title}`}>
    {template.stages.map((stage, index) => {
      const record = records.find(item => item.stageId === stage.id);
      const color = colorFor(record?.status);
      return <Fragment key={stage.id}>
        {index > 0 && <View style={[s.miniLine, { backgroundColor: records[index - 1]?.status === 'completed' ? colors.green : colors.line }]} />}
        <View style={[s.miniNode, { borderColor: color, backgroundColor: record?.status === 'current' ? colors.accentSoft : colors.canvas }]}
          accessibilityLabel={`${stage.title}: ${labelFor(record)}`}>
          {record?.status === 'completed' ? <Check size={14} color={color} /> : record?.status === 'blocked' ? <Pause size={12} color={color} /> : <Txt style={[s.label, { color, fontSize: 11 }]}>{index + 1}</Txt>}
        </View>
      </Fragment>;
    })}
  </View>;
  return <View style={s.root} onLayout={event => setWidth(event.nativeEvent.layout.width)} testID={`workflow-map-${template.id}`}>
    <View style={s.heading}><presentation.icon size={20} color={colors.accent} /><Txt style={[s.title, { flex: 1 }]}>{template.title}</Txt>{!!records.length && <Badge tone="blue">{completed}/{template.stages.length} etapas</Badge>}</View>
    <View style={s.actors}>
      <View style={s.actor}><UsersRound size={14} color={colors.muted} /><Txt style={s.label}>Quem participa</Txt></View>
      <View style={s.people}>{(['translator', 'reviewer', 'employee'] as const).map(role => <View key={role} style={s.actor}>
        <View style={[s.dot, { backgroundColor: role === 'translator' ? colors.blue : role === 'reviewer' ? colors.amber : colors.muted }]} /><Txt style={s.caption}>{roleLabels[role]}</Txt>
      </View>)}</View>
      <ArrowDown size={20} color={colors.muted} />
    </View>
    <View style={s.band}>
      <View style={vertical ? s.column : s.row} testID="workflow-map-track">
        <View style={[s.terminal, vertical && s.terminalVertical]}><CirclePlay size={40} strokeWidth={1.5} color={records.length ? colors.green : colors.muted} /><Txt style={s.label}>Início</Txt></View>
        {template.stages.map((stage, index) => {
          const record = records.find(item => item.stageId === stage.id);
          const color = colorFor(record?.status), Icon = record?.status === 'completed' ? Check : record?.status === 'blocked' ? Pause : icons[stage.id] || ClipboardList;
          const active = record?.status === 'current' || record?.status === 'blocked';
          const Connector = vertical ? ArrowDown : ArrowRight;
          return <Fragment key={stage.id}>
            <View style={[s.arrow, vertical && s.verticalArrow]}><Connector size={17} color={index === 0 ? colors.muted : colorFor(records.find(item => item.stageId === template.stages[index - 1].id)?.status)} /></View>
            <Pressable testID={`workflow-map-stage-${stage.id}`} accessibilityRole="button"
              accessibilityLabel={`Etapa ${index + 1}: ${stage.title}. ${labelFor(record)}. ${record?.assignee || roleLabels[stage.role]}`}
              aria-current={active ? 'step' : undefined} accessibilityState={{ selected: selected.id === stage.id }}
              onPress={() => setInspection({ id: stage.id, signature })} style={({ hovered }) => [s.node, vertical && s.verticalNode, (hovered || inspected === stage.id) && { backgroundColor: colors.surface }]}>
              <View style={[s.circle, { borderColor: color, backgroundColor: active ? record?.status === 'blocked' ? colors.amberSoft : colors.accentSoft : colors.surface }]}><Icon size={19} color={color} strokeWidth={1.8} /></View>
              <View style={[s.nodeText, vertical && s.verticalText]}>
                <Txt style={[s.stageName, vertical && s.verticalName, { color: record?.status === 'pending' ? colors.muted : colors.ink }]}>{stage.title}</Txt>
                {active ? <Txt style={[s.current, record?.status === 'blocked' && { color: colors.amber }]}>{record?.status === 'blocked' ? 'Etapa bloqueada' : 'Etapa atual'}</Txt> : <Txt style={[s.status, { color }]}>{record ? statuses[record.status] : roleLabels[stage.role]}</Txt>}
              </View>
            </Pressable>
          </Fragment>;
        })}
        <View style={[s.arrow, vertical && s.verticalArrow]}>{vertical ? <ArrowDown size={17} color={colors.muted} /> : <ArrowRight size={17} color={colors.muted} />}</View>
        <View style={[s.terminal, vertical && s.terminalVertical]}><CircleCheck size={40} strokeWidth={1.5} color={completed === template.stages.length ? colors.green : colors.muted} /><Txt style={s.label}>Resultado</Txt></View>
      </View>
      {!!records.length && <View style={s.legend}>{(['completed', 'current', 'pending'] as const).map(status => <View key={status} style={s.legendItem}><View style={[s.dot, { backgroundColor: colorFor(status) }]} /><Txt style={s.caption}>{statuses[status]}</Txt></View>)}</View>}
    </View>
    <View style={s.information}><ArrowUp size={20} color={colors.muted} /><Txt style={s.label}>Materiais e informações</Txt><Txt style={[s.caption, { textAlign: 'center' }]}>{presentation.input}</Txt></View>
    {completed === template.stages.length && <Txt accessibilityLiveRegion="polite" style={[s.label, { color: colors.green }]}>Processo concluído · {presentation.output}</Txt>}
    {details && <View style={s.detail} testID="workflow-map-detail">
      <View style={s.detailHeading}><Txt style={s.title}>{selected.id === current?.stageId ? 'Etapa atual' : 'Etapa ' + (template.stages.indexOf(selected) + 1)}: {selected.title}</Txt><Badge tone={selected.role === 'translator' ? 'blue' : selected.role === 'reviewer' ? 'amber' : 'neutral'}>{roleLabels[selected.role]}</Badge></View>
      {selectedRecord && <Txt style={s.caption}>Responsável: {selectedRecord.assignee} · {labelFor(selectedRecord)}</Txt>}
      <Txt style={s.caption}>{selected.description}</Txt>
      <View style={s.requirements}>
        <View style={s.detailColumn}><Txt style={s.label}>Requisitos</Txt>{selected.requirements.map(item => <Txt key={item} style={s.caption}>• {item}</Txt>)}</View>
        <View style={s.detailColumn}><Txt style={s.label}>Entregáveis esperados</Txt>{selected.deliverables.map(item => <Txt key={item} style={s.caption}>• {item}</Txt>)}</View>
      </View>
      {!!selectedRecord?.note && <Txt style={s.caption}>Observação: {selectedRecord.note}</Txt>}
      {selectedRecord?.completedAt && <Txt style={s.caption}>Concluída em {formatDeadline(selectedRecord.completedAt)}{selectedRecord.completedBy ? ` · ${selectedRecord.completedBy}` : ''}</Txt>}
    </View>}
  </View>;
}
