import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { AlertCircle, CheckCircle2, Clock3, Download, FileCheck2, FileText, Play, RefreshCw, RotateCcw, UploadCloud } from 'lucide-react-native';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Badge, Button, EmptyState, PageHeading, Txt, common } from '@/components/ui/primitives';
import { colors, font } from '@/constants/design';
import { useSession } from '@/features/auth/session';
import {
  downloadDelivery, downloadDemoDocument, downloadOriginal, formatBytes, getAssignedServices, reviewDelivery,
  selectTranslationDocument, startTask, uploadTranslation,
  type ServiceStatus, type TranslationService,
} from './service';

const demoTasks: TranslationService[] = [
  {
    id: 'TRD-DEMO-101', requestId: 'SOL-DEMO-101', title: 'Manual de segurança industrial', status: 'Aguardando avaliação',
    deadline: '2026-10-02', createdAt: '2026-09-24T13:00:00Z', updatedAt: '2026-09-26T12:30:00Z', lastVersion: 2,
    observations: 'Manter a terminologia do glossário técnico.', source: 'Português', target: 'Inglês', clientName: 'Vértice Engenharia', clientEmail: 'contato@vertice.demo',
    attachments: [], history: [], translator: { id: 'demo-translator-1', name: 'Marina Costa', email: 'marina@echoring.demo' },
    lastDelivery: { id: 'ENT-DEMO-101', name: 'manual-seguranca-parte-1.txt', size: 184320, status: 'Aguardando avaliação', version: 2, submittedAt: '2026-09-26T12:30:00Z', feedback: '', files: [
      { index: 0, name: 'manual-seguranca-parte-1.txt', mediaType: 'text/plain', size: 184320 },
      { index: 1, name: 'manual-seguranca-parte-2.txt', mediaType: 'text/plain', size: 143360 },
    ] },
  },
  {
    id: 'TRD-DEMO-099', requestId: 'SOL-DEMO-099', title: 'Contrato de prestação de serviços', status: 'Entregue',
    deadline: '2026-09-27', createdAt: '2026-09-22T10:00:00Z', updatedAt: '2026-09-26T10:15:00Z', readyAt: '2026-09-26T10:15:00Z', deliveredAt: '2026-09-26T10:15:00Z', lastVersion: 1,
    observations: '', source: 'Inglês', target: 'Português', clientName: 'Almeida & Associados', clientEmail: 'juridico@almeida.demo',
    attachments: [], history: [], translator: { id: 'demo-translator-2', name: 'Lucas Ferreira', email: 'lucas@echoring.demo' },
    lastDelivery: { id: 'ENT-DEMO-099', name: 'contrato-traduzido.txt', size: 97280, status: 'Entregue', version: 1, submittedAt: '2026-09-26T09:40:00Z', feedback: '', files: [
      { index: 0, name: 'contrato-traduzido.txt', mediaType: 'text/plain', size: 97280 },
    ] },
  },
  {
    id: 'TRD-DEMO-094', requestId: 'SOL-DEMO-094', title: 'Apresentação institucional', status: 'Entregue',
    deadline: '2026-09-25', createdAt: '2026-09-20T09:00:00Z', updatedAt: '2026-09-25T16:20:00Z', readyAt: '2026-09-25T15:50:00Z', deliveredAt: '2026-09-25T16:20:00Z', lastVersion: 1,
    observations: '', source: 'Português', target: 'Espanhol', clientName: 'Horizonte Digital', clientEmail: 'projetos@horizonte.demo',
    attachments: [], history: [], translator: { id: 'demo-translator-3', name: 'Camila Rocha', email: 'camila@echoring.demo' },
    lastDelivery: { id: 'ENT-DEMO-094', name: 'apresentacao-institucional.txt', size: 71680, status: 'Entregue', version: 1, submittedAt: '2026-09-25T14:30:00Z', feedback: '', files: [
      { index: 0, name: 'apresentacao-institucional.txt', mediaType: 'text/plain', size: 71680 },
    ] },
  },
];

const statusTone: Record<ServiceStatus, 'blue' | 'green' | 'amber' | 'neutral'> = {
  'Tradutor atribuído': 'blue', 'Em andamento': 'blue', 'Aguardando avaliação': 'green',
  'Revisão solicitada': 'amber', Pronta: 'green', Entregue: 'neutral',
};

export function DeliveriesScreen() {
  const { session } = useSession();
  return session?.role === 'translator' ? <TranslatorTasks /> : <StaffReviews />;
}

function useTasks() {
  const { session } = useSession();
  const token = session?.token;
  const demo = !!session?.demo;
  const [tasks, setTasks] = useState<TranslationService[]>(() => demo ? demoTasks : []);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (demo || !token) { setLoading(false); return; }
    setLoading(true);
    try { setTasks(await getAssignedServices(token)); setError(''); }
    catch (failure) { setError((failure as Error).message); }
    finally { setLoading(false); }
  }, [demo, token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(initial);
  }, [refresh]);
  return { token, tasks, loading, error, setError, setTasks, refresh, demo };
}

function Feedback({ task }: { task: TranslationService }) {
  if (task.status !== 'Revisão solicitada') return null;
  return <View style={s.feedback}><Txt style={{ color: colors.amber, fontWeight: '600' }}>Revisão solicitada pela equipe</Txt><Txt style={common.caption}>{task.lastFeedback || 'Revise o documento e envie uma nova versão.'}</Txt></View>;
}

function TaskDetails({ task, token }: { task: TranslationService; token: string }) {
  return <>
    <View style={s.metadata}><View style={common.row}><Clock3 size={15} color={colors.muted} /><Txt style={common.caption}>Prazo: {task.deadline || 'Não informado'}</Txt></View><Txt style={common.caption}>{task.source} → {task.target}</Txt><Txt style={common.caption}>{task.lastVersion ? `Última versão: ${task.lastVersion}` : 'Nenhuma versão enviada'}</Txt></View>
    {!!task.observations && <View style={s.note}><Txt style={s.eyebrow}>OBSERVAÇÕES</Txt><Txt style={common.caption}>{task.observations}</Txt></View>}
    {!!task.attachments.length && <View style={s.documents}><Txt style={s.eyebrow}>DOCUMENTOS ORIGINAIS</Txt>{task.attachments.map((file, index) => <View key={`${file.name}-${index}`} style={s.document}><FileText size={18} color={colors.accent} /><View style={{ flex: 1 }}><Txt numberOfLines={1}>{file.name}</Txt><Txt style={common.caption}>{formatBytes(file.size)}</Txt></View><Button variant="ghost" icon={Download} onPress={() => void downloadOriginal(task.id, index, file.name, token)}>Baixar</Button></View>)}</View>}
    <Feedback task={task} />
  </>;
}

function TranslatorTasks() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ task?: string }>();
  const { token, tasks, loading, error, setError, refresh } = useTasks();
  const [selected, setSelected] = useState<{ taskId: string; assets: DocumentPickerAsset[] } | null>(null);
  const [view, setView] = useState<'auto' | 'active' | 'finished'>('auto');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const finished = tasks.filter(task => ['Pronta', 'Entregue'].includes(task.status));
  const active = tasks.filter(task => !['Pronta', 'Entregue'].includes(task.status));
  const requestedTask = tasks.find(task => task.id === params.task);
  const effectiveView = view === 'auto' && requestedTask && ['Pronta', 'Entregue'].includes(requestedTask.status) ? 'finished' : view === 'auto' ? 'active' : view;
  const scoped = effectiveView === 'active' ? active : finished;
  const ordered = params.task ? [...scoped].sort(item => item.id === params.task ? -1 : 1) : scoped;

  async function begin(taskId: string) {
    if (!token || busy) return;
    setBusy(taskId); setError(''); setNotice('');
    try { await startTask(taskId, token); setNotice('Tarefa iniciada. Agora você pode enviar a tradução.'); await refresh(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(''); }
  }
  async function choose(taskId: string) {
    setError(''); setNotice('');
    try { const assets = await selectTranslationDocument(); if (assets) setSelected({ taskId, assets }); }
    catch (failure) { setError((failure as Error).message); }
  }
  async function upload() {
    if (!selected || !token || busy) return;
    setBusy(selected.taskId); setError(''); setNotice('');
    try {
      const delivery = await uploadTranslation(selected.taskId, selected.assets, token);
      const count = delivery.files?.length || selected.assets.length;
      setSelected(null); setNotice(`${count} ${count === 1 ? 'arquivo foi enviado' : 'arquivos foram enviados'} como versão ${delivery.version} e ${count === 1 ? 'aguarda' : 'aguardam'} avaliação.`); await refresh();
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(''); }
  }

  return <ScrollView contentContainerStyle={[s.page, width < 700 && s.pageSmall]} showsVerticalScrollIndicator={false}>
    <View style={s.inner}><PageHeading title="Minhas traduções" subtitle="Acesse os originais, trabalhe na tarefa e envie cada versão para avaliação." action={<Button variant="secondary" icon={RefreshCw} loading={loading} onPress={() => void refresh()}>Atualizar</Button>} />
      <Messages notice={notice} error={error} />
      <WorkflowTabs value={effectiveView} onChange={value => setView(value)} tabs={[{ value: 'active', label: 'Em andamento', count: active.length }, { value: 'finished', label: 'Finalizadas', count: finished.length }]} />
      {!!ordered.length && <View style={s.queue}>{ordered.map((task, index) => {
        const available = task.status === 'Em andamento' || task.status === 'Revisão solicitada';
        const files = selected?.taskId === task.id ? selected.assets : [];
        return <View key={task.id} testID={`task-${task.id}`} style={[s.card, task.id === params.task && s.highlight]}><View style={s.sequence}><Txt style={s.sequenceText}>{String(index + 1).padStart(2, '0')}</Txt><View style={s.sequenceLine} /></View><View style={s.cardBody}>
          <TaskHeader task={task} />
          <TaskDetails task={task} token={token!} />
          {!!files.length && <View style={s.selectedFiles}><View style={s.fileSelectionHeading}><Txt style={s.eyebrow}>ARQUIVOS DESTA VERSÃO</Txt><Txt style={common.caption}>{files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}</Txt></View>{files.map((file, fileIndex) => <View key={`${file.name}-${fileIndex}`} style={s.selectedFile}><FileText size={20} color={colors.accent} /><View style={{ flex: 1 }}><Txt numberOfLines={1} style={{ fontWeight: '600' }}>{file.name}</Txt><Txt style={common.caption}>{formatBytes(file.size)}</Txt></View><Button variant="ghost" disabled={!!busy} onPress={() => setSelected(current => {
            if (!current || current.taskId !== task.id) return current;
            const assets = current.assets.filter((_, indexToKeep) => indexToKeep !== fileIndex);
            return assets.length ? { ...current, assets } : null;
          })}>Remover</Button></View>)}</View>}
          {task.status === 'Tradutor atribuído' && <Button icon={Play} loading={busy === task.id} onPress={() => void begin(task.id)}>Iniciar tradução</Button>}
          {available && <><View style={s.actions}><Button variant="secondary" icon={FileText} disabled={!!busy} onPress={() => void choose(task.id)}>{files.length ? 'Trocar arquivos' : 'Selecionar arquivos'}</Button>{!!files.length && <Button icon={UploadCloud} loading={busy === task.id} onPress={() => void upload()}>Enviar {files.length === 1 ? 'arquivo' : `${files.length} arquivos`} para avaliação</Button>}</View><Txt style={common.caption}>PDF, DOCX ou TXT · até 10 arquivos, 5 MB cada e 20 MB no total.</Txt></>}
          {task.status === 'Aguardando avaliação' && <Txt style={common.caption}>A equipe está avaliando a versão mais recente.</Txt>}
          {task.status === 'Pronta' && <Txt style={common.caption}>Tradução aprovada e serviço finalizado.</Txt>}
          {task.status === 'Entregue' && <Txt style={common.caption}>Documento final enviado ao cliente.</Txt>}
        </View></View>;
      })}</View>}
      {!ordered.length && !loading && !error && <EmptyState icon={effectiveView === 'finished' ? CheckCircle2 : UploadCloud} title={effectiveView === 'finished' ? 'Nenhuma tradução finalizada' : 'Nenhuma tarefa em andamento'} text={effectiveView === 'finished' ? 'As traduções aprovadas e entregues ficam organizadas nesta aba.' : 'As tarefas aparecem aqui assim que a equipe atribui uma solicitação aprovada à sua conta.'} />}
    </View>
  </ScrollView>;
}

function StaffReviews() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const { token, tasks, loading, error, setError, setTasks, refresh, demo } = useTasks();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<'review' | 'approved'>('review');
  const awaitingReview = tasks.filter(task => ['Aguardando avaliação', 'Revisão solicitada'].includes(task.status));
  const approved = tasks.filter(task => ['Pronta', 'Entregue'].includes(task.status));
  const reviewable = view === 'review' ? awaitingReview : approved;

  async function review(task: TranslationService, decision: 'approve' | 'request_revision') {
    const delivery = task.lastDelivery;
    if (!delivery || busy || (!demo && !token)) return;
    const note = (feedback[task.id] || '').trim();
    if (decision === 'request_revision' && !note) { setError('Escreva a observação que o tradutor deve seguir na revisão.'); return; }
    setBusy(task.id); setError(''); setNotice('');
    try {
      if (demo) {
        const status = decision === 'approve' ? 'Entregue' : 'Revisão solicitada';
        const completedAt = decision === 'approve' ? new Date().toISOString() : undefined;
        setTasks(current => current.map(item => item.id === task.id ? { ...item, status, readyAt: completedAt || item.readyAt, deliveredAt: completedAt || item.deliveredAt, updatedAt: completedAt || item.updatedAt, lastFeedback: note, lastDelivery: item.lastDelivery ? { ...item.lastDelivery, status, feedback: note } : item.lastDelivery } : item));
        setNotice(decision === 'approve' ? 'Simulação: tradução aprovada e serviço finalizado. Nenhum e-mail foi enviado.' : 'Simulação: revisão solicitada ao tradutor.');
      } else {
        await reviewDelivery(delivery.id, decision, note, token!);
        setNotice(decision === 'approve' ? 'Tradução aprovada e serviço finalizado.' : 'Revisão solicitada ao tradutor.');
        await refresh();
      }
      setFeedback(current => ({ ...current, [task.id]: '' }));
      if (decision === 'approve') {
        setView('approved');
        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
      }
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(''); }
  }
  return <ScrollView ref={scrollRef} contentContainerStyle={[s.page, width < 700 && s.pageSmall]} showsVerticalScrollIndicator={false}>
    <View style={s.inner}><PageHeading title="Avaliações e entregas" subtitle="Revise as versões dos tradutores e aprove a tradução para finalizar o serviço." action={<Button variant="secondary" icon={RefreshCw} loading={loading} onPress={() => void refresh()}>Atualizar</Button>} />
      {demo && <View style={s.demoBanner}><Badge tone="amber">Simulação local</Badge><Txt style={[common.caption, { flex: 1 }]}>A aprovação finaliza o serviço apenas nesta demonstração. Nenhum e-mail será enviado.</Txt></View>}
      <Messages notice={notice} error={error} />
      <WorkflowTabs value={view} onChange={setView} tabs={[{ value: 'review', label: 'Para avaliar', count: awaitingReview.length }, { value: 'approved', label: 'Finalizadas', count: approved.length }]} />
      {!!reviewable.length && <View style={s.queue}>{reviewable.map((task, index) => <View key={task.id} style={s.card}><View style={s.sequence}><Txt style={s.sequenceText}>{String(index + 1).padStart(2, '0')}</Txt><View style={s.sequenceLine} /></View><View style={s.cardBody}>
        <TaskHeader task={task} />
        <View style={s.metadata}><Txt style={common.caption}>Tradutor: {task.translator?.name || 'Não informado'}</Txt><Txt style={common.caption}>Cliente: {task.clientName} · {task.clientEmail}</Txt><Txt style={common.caption}>Versão {task.lastDelivery?.version || 0}</Txt></View>
        {task.lastDelivery && <View style={s.deliveryFiles}>{(task.lastDelivery.files?.length ? task.lastDelivery.files : [{ index: 0, name: task.lastDelivery.name, size: task.lastDelivery.size, mediaType: '' }]).map(file => <View key={`${task.lastDelivery!.id}-${file.index}`} style={s.document}><FileCheck2 size={20} color={colors.accent} /><View style={{ flex: 1 }}><Txt>{file.name}</Txt><Txt style={common.caption}>{formatBytes(file.size)}</Txt></View><Button variant="secondary" icon={Download} onPress={() => demo ? downloadDemoDocument(file.name) : void downloadDelivery(task.lastDelivery!.id, file.name, token!, file.index)}>Baixar arquivo</Button></View>)}</View>}
        {task.status === 'Aguardando avaliação' && <><View style={s.field}><Txt style={s.label}>Observação para revisão</Txt><TextInput accessibilityLabel={`Observação de revisão de ${task.title}`} value={feedback[task.id] || ''} onChangeText={value => setFeedback(current => ({ ...current, [task.id]: value }))} placeholder="Obrigatória ao solicitar revisão" placeholderTextColor={colors.muted} multiline maxLength={3000} style={[s.input, s.textarea]} /></View><View style={s.actions}><Button variant="secondary" icon={RotateCcw} disabled={!!busy} onPress={() => void review(task, 'request_revision')}>Solicitar revisão</Button><Button icon={CheckCircle2} loading={busy === task.id} onPress={() => void review(task, 'approve')}>Aprovar tradução</Button></View></>}
        {task.status === 'Revisão solicitada' && <Feedback task={task} />}
        {task.status === 'Pronta' && <Txt style={{ color: colors.green }}>Tradução aprovada e serviço finalizado.</Txt>}
        {task.status === 'Entregue' && <Txt style={{ color: colors.green }}>Entregue em {task.deliveredAt ? new Date(task.deliveredAt).toLocaleString('pt-BR') : 'data não informada'}.</Txt>}
      </View></View>)}</View>}
      {!reviewable.length && !loading && !error && <EmptyState icon={FileCheck2} title={view === 'review' ? 'Nenhuma avaliação pendente' : 'Nenhuma tradução aprovada'} text={view === 'review' ? 'As versões enviadas pelos tradutores aparecerão aqui.' : 'As traduções aprovadas e já entregues ficam organizadas nesta aba.'} />}
    </View>
  </ScrollView>;
}

function TaskHeader({ task }: { task: TranslationService }) {
  return <View style={s.cardHeader}><View style={s.fileIcon}><FileCheck2 size={24} color={colors.accent} /></View><View style={{ flex: 1, minWidth: 0, gap: 5 }}><Txt style={s.title}>{task.title}</Txt><Txt style={common.caption}>{task.id}{task.requestId ? ` · ${task.requestId}` : ''}</Txt></View><Badge tone={statusTone[task.status]}>{task.status}</Badge></View>;
}

function WorkflowTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (value: T) => void; tabs: { value: T; label: string; count: number }[] }) {
  return <View accessibilityRole="tablist" style={s.tabs}>{tabs.map(tab => <Pressable key={tab.value} accessibilityRole="tab" aria-selected={value === tab.value} accessibilityState={{ selected: value === tab.value }} onPress={() => onChange(tab.value)} style={[s.tab, value === tab.value && s.tabActive]}><Txt style={[s.tabText, value === tab.value && s.tabTextActive]}>{tab.label} ({tab.count})</Txt></Pressable>)}</View>;
}

function Messages({ notice, error }: { notice: string; error: string }) {
  return <>{!!notice && <View style={s.notice}><CheckCircle2 size={20} color={colors.green} /><Txt accessibilityLiveRegion="polite" testID="delivery-notice" style={{ color: colors.green, flex: 1 }}>{notice}</Txt></View>}{!!error && <View style={s.error}><AlertCircle size={20} color={colors.red} /><Txt accessibilityRole="alert" style={{ color: colors.red, flex: 1 }}>{error}</Txt></View>}</>;
}

const s = StyleSheet.create({
  page: { padding: 40, paddingTop: 28, paddingBottom: 40, flexGrow: 1 }, pageSmall: { padding: 20, paddingTop: 26 },
  inner: { width: '100%', maxWidth: 1050, alignSelf: 'center' },
  demoBanner: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 14, marginBottom: 18, borderRadius: 14, backgroundColor: colors.amberSoft },
  tabs: { flexDirection: 'row', gap: 4, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: colors.accent },
  tabText: { fontSize: 14, lineHeight: 20, color: colors.muted }, tabTextActive: { color: colors.accent, fontWeight: '600' },
  notice: { flexDirection: 'row', gap: 10, padding: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.green, backgroundColor: colors.greenSoft },
  error: { flexDirection: 'row', gap: 10, padding: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.red, backgroundColor: colors.redSoft },
  queue: { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  card: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line }, highlight: { borderWidth: 1, borderColor: colors.accent },
  sequence: { width: 62, alignItems: 'center', paddingTop: 25, backgroundColor: '#0C0C0E' }, sequenceText: { fontSize: 11, lineHeight: 17, color: colors.muted, letterSpacing: 1.5, fontWeight: '600' }, sequenceLine: { flex: 1, width: 1, marginTop: 12, backgroundColor: '#3B2630' },
  cardBody: { flex: 1, minWidth: 0, gap: 18, paddingHorizontal: 22, paddingVertical: 22 }, cardHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  fileIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 20, lineHeight: 27, fontWeight: '600' },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  note: { gap: 6, padding: 14, backgroundColor: colors.canvas, borderLeftWidth: 3, borderLeftColor: colors.accent },
  eyebrow: { fontSize: 9, lineHeight: 15, letterSpacing: 1.5, color: colors.accent, fontWeight: '600' },
  documents: { gap: 8 }, deliveryFiles: { gap: 8 }, document: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  feedback: { gap: 6, padding: 16, borderRadius: 16, backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: colors.amber },
  selectedFiles: { gap: 8 }, fileSelectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, selectedFile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { gap: 8 }, label: { fontSize: 12, lineHeight: 18, color: '#CBCBD0', fontWeight: '600' },
  input: { minHeight: 50, borderRadius: 11, backgroundColor: colors.canvas, borderWidth: 1, borderColor: '#39393E', paddingHorizontal: 14, fontFamily: font, fontSize: 14, color: colors.ink, outlineWidth: 0 },
  textarea: { minHeight: 96, paddingVertical: 13, textAlignVertical: 'top' },
});
