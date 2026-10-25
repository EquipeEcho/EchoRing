import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { OptionSelectField } from '@/components/ui/fields/option-select-field';
import { Txt } from '@/components/ui/text';
import { TextInput } from '@/components/ui/text-input';
import { useSession } from '@/features/auth/contexts/session-context';
import { useTheme } from '@/theme/theme-context';

import { workflowTemplates } from '../data/workflow-templates';
import { assignWorkflow, listWorkflowReviewers, updateWorkflowStage } from '../services/workflow-service';
import { useStyles } from '../styles/workflows.styles';
import { type ServiceWorkflow, type WorkflowJob } from '../types';

export function WorkflowControls({ job, onSaved, onRefresh }: {
  job: WorkflowJob; onSaved: (workflow: ServiceWorkflow) => void; onRefresh: () => void;
}) {
  const { session } = useSession();
  const staff = session?.role === 'employee' || session?.role === 'admin';
  const s = useStyles();
  const { colors } = useTheme();
  const [title, setTitle] = useState(workflowTemplates[0].title);
  const [reviewers, setReviewers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [reviewer, setReviewer] = useState('Eu, responsável pela alocação');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const workflow = job.workflow;
  const current = workflow?.stages.find(stage => stage.status === 'current' || stage.status === 'blocked');
  const definition = workflow?.definition.stages.find(stage => stage.id === current?.stageId);
  useEffect(() => {
    if (job.source !== 'api' || !staff || workflow || !session?.token) return;
    let active = true;
    void listWorkflowReviewers(session.token).then(people => { if (active) setReviewers(people); })
      .catch(() => { /* Default assignment remains available when the optional list cannot load. */ });
    return () => { active = false; };
  }, [job.source, staff, workflow, session?.token]);
  async function save(action?: 'complete' | 'block' | 'resume') {
    if (busy || !session?.token) return;
    if (action === 'block' && !note.trim()) { setError('Descreva o motivo do bloqueio.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const updated = workflow && current && action
        ? await updateWorkflowStage(job.id, current.stageId, action, workflow.revision, note.trim(), session.token)
        : await assignWorkflow(job.id, workflowTemplates.find(template => template.title === title)!.id,
          reviewers.find(person => `${person.name} · ${person.email}` === reviewer)?.id, session.token);
      onSaved(updated); onRefresh(); setNote('');
      setNotice(action ? 'Andamento atualizado e registrado no histórico.' : 'Workflow vinculado ao trabalho. A preparação está pronta para começar.');
    } catch (failure) { setError((failure as Error).message); onRefresh(); }
    finally { setBusy(false); }
  }
  if (job.source !== 'api' || !session?.token) return null;
  if (!workflow && (!staff || job.serviceStatus === 'Entregue') && !error && !notice) return null;
  const permitted = definition?.role === 'translator' ? !staff : staff;
  const reviewingFiles = staff && definition?.role !== 'translator' && job.serviceStatus === 'Aguardando avaliação';
  return <View style={s.controls}>
    {!workflow && staff && job.serviceStatus !== 'Entregue' && <>
      <Txt style={s.sectionTitle}>Definir processo do trabalho</Txt>
      <OptionSelectField compact label="Workflow a alocar" value={title} options={workflowTemplates.map(template => template.title)} onChange={setTitle} disabled={busy} />
      <OptionSelectField compact label="Responsável pela revisão e QA" value={reviewer} disabled={busy}
        options={['Eu, responsável pela alocação', ...reviewers.map(person => `${person.name} · ${person.email}`)]} onChange={setReviewer} />
      <Txt style={s.muted}>As etapas do tradutor ficam com {job.translator?.name || 'o profissional alocado'}. Você coordena as etapas de preparação e entrega. O modelo será preservado após a atribuição.</Txt>
      <Button loading={busy} onPress={() => void save()}>Alocar workflow</Button>
    </>}
    {workflow && current && <>
      <Txt style={s.sectionTitle}>{permitted ? 'Atualizar andamento' : 'Acompanhar andamento'}</Txt>
      <Txt style={s.muted}>Responsável: {current.assignee}. {definition?.role === 'translator' ? 'Conclusão registrada pelo tradutor.' : 'Conclusão registrada pela equipe de revisão ou gestão.'}</Txt>
      {(permitted || staff) && <>
        <Txt style={s.detailLabel}>Observação ou motivo do bloqueio</Txt>
        <TextInput accessibilityLabel="Observação da etapa" value={note} onChangeText={setNote} multiline maxLength={2000} editable={!busy}
          placeholder="Registre uma observação. Para bloquear, informe o motivo." placeholderTextColor={colors.muted} style={s.noteInput} />
        <View style={s.row}>
          {current.status === 'blocked' ? <Button disabled={busy} onPress={() => void save('resume')}>Retomar etapa</Button> : <>
            {reviewingFiles ? <Button onPress={() => router.push({ pathname: '/entregas', params: { task: job.id } })}>Avaliar arquivos desta etapa</Button>
              : permitted && <Button loading={busy} onPress={() => void save('complete')}>Concluir etapa</Button>}
            <Button variant="secondary" disabled={busy} onPress={() => void save('block')}>Bloquear etapa</Button>
          </>}
        </View>
      </>}
      <Txt style={s.muted}>O envio dos arquivos conclui as etapas atuais do tradutor. A avaliação da equipe atualiza as etapas seguintes automaticamente.</Txt>
    </>}
    {workflow && !current && <Txt style={s.muted}>Todas as etapas deste processo foram concluídas.</Txt>}
    {!!error && <Txt accessibilityRole="alert" style={{ color: colors.red }}>{error}</Txt>}
    {!!notice && <Txt accessibilityLiveRegion="polite" style={{ color: colors.green }}>{notice}</Txt>}
  </View>;
}
