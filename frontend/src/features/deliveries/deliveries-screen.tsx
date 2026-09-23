import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { AlertCircle, CheckCircle2, Clock3, Download, FileCheck2, FileText, Play, RefreshCw, RotateCcw, Send, UploadCloud } from 'lucide-react-native';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Badge, Button, EmptyState, PageHeading, Txt, common } from '@/components/ui/primitives';
import { colors, font } from '@/constants/design';
import { useSession } from '@/features/auth/session';
import {
  downloadDelivery, downloadOriginal, formatBytes, getAssignedServices, reviewDelivery,
  selectTranslationDocument, sendFinal, startTask, uploadTranslation,
  type ServiceStatus, type TranslationService,
} from './service';

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
  const [tasks, setTasks] = useState<TranslationService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try { setTasks(await getAssignedServices(token)); setError(''); }
    catch (failure) { setError((failure as Error).message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(initial);
  }, [refresh]);
  return { token, tasks, loading, error, setError, refresh };
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
  const [selected, setSelected] = useState<{ taskId: string; asset: DocumentPickerAsset } | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const ordered = params.task ? [...tasks].sort(item => item.id === params.task ? -1 : 1) : tasks;

  async function begin(taskId: string) {
    if (!token || busy) return;
    setBusy(taskId); setError(''); setNotice('');
    try { await startTask(taskId, token); setNotice('Tarefa iniciada. Agora você pode enviar a tradução.'); await refresh(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(''); }
  }
  async function choose(taskId: string) {
    setError(''); setNotice('');
    try { const asset = await selectTranslationDocument(); if (asset) setSelected({ taskId, asset }); }
    catch (failure) { setError((failure as Error).message); }
  }
  async function upload() {
    if (!selected || !token || busy) return;
    setBusy(selected.taskId); setError(''); setNotice('');
    try {
      const delivery = await uploadTranslation(selected.taskId, selected.asset, token);
      setSelected(null); setNotice(`${delivery.name} foi enviado como versão ${delivery.version} e aguarda avaliação.`); await refresh();
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(''); }
  }

  return <ScrollView contentContainerStyle={[s.page, width < 700 && s.pageSmall]} showsVerticalScrollIndicator={false}>
    <View style={s.inner}><PageHeading title="Minhas traduções" subtitle="Acesse os originais, trabalhe na tarefa e envie cada versão para avaliação." action={<Button variant="secondary" icon={RefreshCw} loading={loading} onPress={() => void refresh()}>Atualizar</Button>} />
      <Messages notice={notice} error={error} />
      {!!ordered.length && <View style={s.queue}>{ordered.map((task, index) => {
        const available = task.status === 'Em andamento' || task.status === 'Revisão solicitada';
        const file = selected?.taskId === task.id ? selected.asset : null;
        return <View key={task.id} testID={`task-${task.id}`} style={[s.card, task.id === params.task && s.highlight]}><View style={s.sequence}><Txt style={s.sequenceText}>{String(index + 1).padStart(2, '0')}</Txt><View style={s.sequenceLine} /></View><View style={s.cardBody}>
          <TaskHeader task={task} />
          <TaskDetails task={task} token={token!} />
          {file && <View style={s.selectedFile}><FileText size={20} color={colors.accent} /><View style={{ flex: 1 }}><Txt numberOfLines={1} style={{ fontWeight: '600' }}>{file.name}</Txt><Txt style={common.caption}>{formatBytes(file.size)}</Txt></View><Button variant="ghost" disabled={!!busy} onPress={() => setSelected(null)}>Remover</Button></View>}
          {task.status === 'Tradutor atribuído' && <Button icon={Play} loading={busy === task.id} onPress={() => void begin(task.id)}>Iniciar tradução</Button>}
          {available && <View style={s.actions}><Button variant="secondary" icon={FileText} disabled={!!busy} onPress={() => void choose(task.id)}>{file ? 'Trocar documento' : 'Selecionar tradução'}</Button>{file && <Button icon={UploadCloud} loading={busy === task.id} onPress={() => void upload()}>Enviar para avaliação</Button>}</View>}
          {task.status === 'Aguardando avaliação' && <Txt style={common.caption}>A equipe está avaliando a versão mais recente.</Txt>}
          {task.status === 'Pronta' && <Txt style={common.caption}>Tradução aprovada. A equipe fará o envio ao cliente.</Txt>}
          {task.status === 'Entregue' && <Txt style={common.caption}>Documento final enviado ao cliente.</Txt>}
        </View></View>;
      })}</View>}
      {!ordered.length && !loading && !error && <EmptyState icon={UploadCloud} title="Nenhuma tarefa atribuída" text="As tarefas aparecem aqui assim que a equipe atribui uma solicitação aprovada à sua conta." />}
    </View>
  </ScrollView>;
}

function StaffReviews() {
  const { width } = useWindowDimensions();
  const { token, tasks, loading, error, setError, refresh } = useTasks();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const reviewable = tasks.filter(task => ['Aguardando avaliação', 'Revisão solicitada', 'Pronta', 'Entregue'].includes(task.status));

  async function review(task: TranslationService, decision: 'approve' | 'request_revision') {
    const delivery = task.lastDelivery;
    if (!token || !delivery || busy) return;
    const note = (feedback[task.id] || '').trim();
    if (decision === 'request_revision' && !note) { setError('Escreva a observação que o tradutor deve seguir na revisão.'); return; }
    setBusy(task.id); setError(''); setNotice('');
    try {
      await reviewDelivery(delivery.id, decision, note, token);
      setNotice(decision === 'approve' ? 'Tradução aprovada e pronta para envio ao cliente.' : 'Revisão solicitada ao tradutor.');
      setFeedback(current => ({ ...current, [task.id]: '' })); await refresh();
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(''); }
  }
  async function deliver(task: TranslationService) {
    if (!token || busy) return;
    setBusy(task.id); setError(''); setNotice('');
    try { await sendFinal(task.id, token); setNotice('Documento final aceito pelo provedor para envio ao cliente.'); await refresh(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(''); }
  }

  return <ScrollView contentContainerStyle={[s.page, width < 700 && s.pageSmall]} showsVerticalScrollIndicator={false}>
    <View style={s.inner}><PageHeading title="Avaliações e entregas" subtitle="Revise as versões dos tradutores e envie o documento final ao cliente." action={<Button variant="secondary" icon={RefreshCw} loading={loading} onPress={() => void refresh()}>Atualizar</Button>} />
      <Messages notice={notice} error={error} />
      {!!reviewable.length && <View style={s.queue}>{reviewable.map((task, index) => <View key={task.id} style={s.card}><View style={s.sequence}><Txt style={s.sequenceText}>{String(index + 1).padStart(2, '0')}</Txt><View style={s.sequenceLine} /></View><View style={s.cardBody}>
        <TaskHeader task={task} />
        <View style={s.metadata}><Txt style={common.caption}>Tradutor: {task.translator?.name || 'Não informado'}</Txt><Txt style={common.caption}>Cliente: {task.clientName} · {task.clientEmail}</Txt><Txt style={common.caption}>Versão {task.lastDelivery?.version || 0}</Txt></View>
        {task.lastDelivery && <View style={s.document}><FileCheck2 size={20} color={colors.accent} /><View style={{ flex: 1 }}><Txt>{task.lastDelivery.name}</Txt><Txt style={common.caption}>{formatBytes(task.lastDelivery.size)}</Txt></View><Button variant="secondary" icon={Download} onPress={() => void downloadDelivery(task.lastDelivery!.id, task.lastDelivery!.name, token!)}>Baixar versão</Button></View>}
        {task.status === 'Aguardando avaliação' && <><View style={s.field}><Txt style={s.label}>Observação para revisão</Txt><TextInput accessibilityLabel={`Observação de revisão de ${task.title}`} value={feedback[task.id] || ''} onChangeText={value => setFeedback(current => ({ ...current, [task.id]: value }))} placeholder="Obrigatória ao solicitar revisão" placeholderTextColor={colors.muted} multiline maxLength={3000} style={[s.input, s.textarea]} /></View><View style={s.actions}><Button variant="secondary" icon={RotateCcw} disabled={!!busy} onPress={() => void review(task, 'request_revision')}>Solicitar revisão</Button><Button icon={CheckCircle2} loading={busy === task.id} onPress={() => void review(task, 'approve')}>Aprovar tradução</Button></View></>}
        {task.status === 'Revisão solicitada' && <Feedback task={task} />}
        {task.status === 'Pronta' && <Button icon={Send} loading={busy === task.id} onPress={() => void deliver(task)}>Enviar documento final ao cliente</Button>}
        {task.status === 'Entregue' && <Txt style={{ color: colors.green }}>Entregue em {task.deliveredAt ? new Date(task.deliveredAt).toLocaleString('pt-BR') : 'data não informada'}.</Txt>}
      </View></View>)}</View>}
      {!reviewable.length && !loading && !error && <EmptyState icon={FileCheck2} title="Nenhuma avaliação pendente" text="As versões enviadas pelos tradutores aparecerão aqui." />}
    </View>
  </ScrollView>;
}

function TaskHeader({ task }: { task: TranslationService }) {
  return <View style={s.cardHeader}><View style={s.fileIcon}><FileCheck2 size={24} color={colors.accent} /></View><View style={{ flex: 1, minWidth: 0, gap: 5 }}><Txt style={s.title}>{task.title}</Txt><Txt style={common.caption}>{task.id}{task.requestId ? ` · ${task.requestId}` : ''}</Txt></View><Badge tone={statusTone[task.status]}>{task.status}</Badge></View>;
}

function Messages({ notice, error }: { notice: string; error: string }) {
  return <>{!!notice && <View style={s.notice}><CheckCircle2 size={20} color={colors.green} /><Txt accessibilityLiveRegion="polite" testID="delivery-notice" style={{ color: colors.green, flex: 1 }}>{notice}</Txt></View>}{!!error && <View style={s.error}><AlertCircle size={20} color={colors.red} /><Txt accessibilityRole="alert" style={{ color: colors.red, flex: 1 }}>{error}</Txt></View>}</>;
}

const s = StyleSheet.create({
  page: { padding: 40, paddingTop: 28, paddingBottom: 40, flexGrow: 1 }, pageSmall: { padding: 20, paddingTop: 26 },
  inner: { width: '100%', maxWidth: 1050, alignSelf: 'center' },
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
  documents: { gap: 8 }, document: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  feedback: { gap: 6, padding: 16, borderRadius: 16, backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: colors.amber },
  selectedFile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { gap: 8 }, label: { fontSize: 12, lineHeight: 18, color: '#CBCBD0', fontWeight: '600' },
  input: { minHeight: 50, borderRadius: 11, backgroundColor: colors.canvas, borderWidth: 1, borderColor: '#39393E', paddingHorizontal: 14, fontFamily: font, fontSize: 14, color: colors.ink, outlineWidth: 0 },
  textarea: { minHeight: 96, paddingVertical: 13, textAlignVertical: 'top' },
});
