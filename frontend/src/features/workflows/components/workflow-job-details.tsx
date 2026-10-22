import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OptionSelectField } from '@/components/ui/fields/option-select-field';
import { Txt } from '@/components/ui/text';

import { workflowTemplates } from '../data/workflow-templates';
import { useStyles } from '../styles/workflows.styles';
import { type ServiceWorkflow, type WorkflowJob } from '../types';
import { WorkflowControls } from './workflow-controls';
import { formatDeadline, isOverdue, templateFor } from '../utils/workflow-utils';
import { WorkflowStatusBadge } from './workflow-job-card';
import { WorkflowProgress } from './workflow-progress';
import { WorkflowMap } from './workflow-map';
import { ResponsibilityLegend, WorkflowTimeline } from './workflow-timeline';

export function WorkflowJobDetails({ job: incoming, now, onRefresh }: { job: WorkflowJob; now: number; onRefresh: () => void }) {
  const s = useStyles();
  const [saved, setSaved] = useState<ServiceWorkflow>();
  const workflow = saved && saved.revision >= (incoming.workflow?.revision ?? 0) ? saved : incoming.workflow;
  const job = workflow ? { ...incoming, workflow, templateId: workflow.templateId, stages: workflow.stages, blocker: workflow.blocker } : incoming;
  const [referenceTitle, setReferenceTitle] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const assigned = templateFor(job);
  const reference = assigned || workflowTemplates.find(template => template.title === referenceTitle);
  return <View style={s.stack}>
    <View style={s.row}><WorkflowStatusBadge job={job} now={now} /><Badge tone="neutral">{assigned?.shortTitle || 'Workflow não informado'}</Badge></View>
    <View style={{ gap: 9 }}>
      <View style={s.between}><Txt style={s.muted}>Tradutor: {job.translator?.name || 'Não informado'}</Txt><Txt style={s.muted}>Idiomas: {job.languages}</Txt></View>
      <View style={s.between}><Txt style={s.muted}>Cliente: {job.client}</Txt><Txt style={s.muted}>Prazo do serviço: {formatDeadline(job.deadline)}{isOverdue(job, now) ? ' · Atrasado' : ''}</Txt></View>
      {job.serviceStatus && <Txt style={s.muted}>Status do serviço: {job.serviceStatus}</Txt>}
      <WorkflowProgress job={job} />
    </View>
    {job.source === 'demo' && <Txt style={s.muted}>Todos os nomes, prazos, responsáveis e registros de etapas deste trabalho são demonstrativos.</Txt>}
    {(job.blocker || job.attention) && <View style={s.alert}><Txt style={s.alertText}>{job.blocker ? 'Bloqueio: ' : 'Atenção: '}{job.blocker || job.attention}</Txt></View>}
    {!assigned && <>
      <View style={s.banner}>
        <Txt style={s.detailLabel}>Etapas ainda não disponíveis</Txt>
        <Txt style={s.muted}>Este serviço ainda não tem um workflow atribuído. O funcionário pode definir o modelo para registrar as etapas e seus responsáveis.</Txt>
        <Txt style={s.muted}>Escolha um modelo para orientação. Esta consulta não vincula um workflow ao serviço nem registra progresso.</Txt>
      </View>
      <OptionSelectField label="Modelo para consulta" value={referenceTitle} onChange={setReferenceTitle} options={workflowTemplates.map(template => template.title)} placeholder="Escolher um modelo de referência" />
    </>}
    {reference && <>
      {!assigned && <Txt style={s.muted}>Modelo de referência · sem registros do serviço</Txt>}
      <WorkflowMap template={reference} records={assigned ? job.stages : []} />
    </>}
    <WorkflowControls job={job} onSaved={setSaved} onRefresh={onRefresh} />
    {reference && <>
      <Button variant="ghost" onPress={() => setShowTimeline(value => !value)}>{showTimeline ? 'Recolher detalhes das etapas' : 'Ver todas as etapas e responsáveis'}</Button>
      {showTimeline && <><Txt accessibilityRole="header" style={s.sectionTitle}>Timeline do trabalho</Txt><ResponsibilityLegend /><WorkflowTimeline template={reference} records={assigned ? job.stages : []} /></>}
    </>}
    {job.source === 'api' && <Button variant="secondary" onPress={() => { router.push({ pathname: '/entregas', params: { task: job.id } }); }}>Abrir serviço em Entregas</Button>}
  </View>;
}
