import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { ArrowUpRight, CheckCircle2, ChevronRight, Download, FileText, History, Inbox, Mail, RefreshCw, Save, Search, Send, UserCheck } from 'lucide-react-native';
import { Badge, Button, EmptyState, PageHeading, Txt, common } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { DateSelectField, formatSelectedDate } from '@/components/ui/selection-fields';
import { colors, font } from '@/constants/design';
import { useSession } from '@/features/auth/session';
import { assignTranslator, downloadDocument, getRequest, getTranslators, money, sendQuote, updateRequest, type Quote, type TranslationRequest, type TranslatorOption } from './service';
import { useInbox } from './inbox';

const emptyQuote: Quote = { amount: '', delivery: '', message: 'A proposta inclui tradução e revisão do material descrito. Para aprovar ou esclarecer dúvidas, responda a este e-mail.' };
export function RequestsScreen() {
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const token = session?.token;
  const { requests, loading, error: loadError, refresh } = useInbox();
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TranslationRequest | null>(null);
  const [quote, setQuote] = useState<Quote>({ ...emptyQuote });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [translators, setTranslators] = useState<TranslatorOption[]>([]);
  const [assignment, setAssignment] = useState({ translatorId: '', deadline: '', observations: '' });
  const locked = !!selected && !['Recebido', 'Em análise'].includes(selected.status);
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = requests.filter(item => (filter === 'Todos' || item.status === filter) && normalize(item.title + item.name + item.email + item.id).includes(normalize(search)));
  async function open(request: TranslationRequest) {
    setError(''); setNotice(''); setBusy(true);
    try {
      const detail = await getRequest(request.id, token);
      const available = token && detail.status === 'Orçamento aprovado' ? await getTranslators(token) : [];
      setSelected(detail); setQuote(detail.quote ?? { ...emptyQuote }); setTranslators(available);
      setAssignment({ translatorId: '', deadline: detail.quote?.delivery || detail.deadline || '', observations: '' });
    }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function analyze() {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try { setSelected(await updateRequest(selected.id, { status: 'Em análise' }, token)); await refresh(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function save(): Promise<boolean> {
    if (!selected || busy) return false;
    if (!/^\d{1,8}([.,]\d{1,2})?$/.test(quote.amount.trim()) || Number(quote.amount.replace(',', '.')) <= 0 || !quote.delivery.trim()) {
      setError('Informe um valor positivo e o prazo de entrega.'); return false;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      setSelected(await updateRequest(selected.id, { quote: { amount: quote.amount.trim(), delivery: quote.delivery.trim(), message: quote.message.trim() } }, token));
      setNotice('Rascunho salvo. O e-mail ainda não foi enviado.'); await refresh(); return true;
    } catch (failure) { setError((failure as Error).message); return false; }
    finally { setBusy(false); }
  }
  async function prepare() { if (await save()) setConfirm(true); }
  async function send() {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try {
      const result = token ? await sendQuote(selected.id, token) : await updateRequest(selected.id, { status: 'Orçamento simulado' });
      setSelected(result); setConfirm(false); setNotice(result.autoApproved ? 'Orçamento aprovado automaticamente para teste. Nenhum e-mail foi enviado.' : token ? 'Orçamento aceito pelo provedor de e-mail para envio ao cliente.' : 'Envio simulado. Nenhum e-mail foi enviado ao cliente.'); await refresh();
    } catch (failure) { setConfirm(false); setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function createTask() {
    if (!selected || !token || busy) return;
    if (!assignment.translatorId || !assignment.deadline.trim()) { setError('Selecione o tradutor e informe o prazo da tarefa.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await assignTranslator(selected.id, { ...assignment, deadline: assignment.deadline.trim(), observations: assignment.observations.trim() }, token);
      setSelected(await getRequest(selected.id, token));
      setNotice('Tarefa criada e disponibilizada no painel do tradutor.'); await refresh();
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  function close() { if (!busy) { setSelected(null); setError(''); setNotice(''); } }
  return <ScrollView contentContainerStyle={[s.page, width < 700 && { padding: 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <PageHeading title="Solicitações" subtitle="Da primeira mensagem ao orçamento. Tudo começa aqui." action={<Button variant="secondary" icon={RefreshCw} loading={loading} onPress={() => void refresh()}>Atualizar</Button>} />
    <View style={[s.summary, width < 700 && s.summarySmall]}><View style={s.summaryCount}><Txt style={s.summaryNumber}>{requests.filter(item => item.status === 'Recebido').length}</Txt><View><Txt style={s.summaryLabel}>AGUARDANDO ANÁLISE</Txt><Txt style={s.summaryTitle}>Novos pedidos do site</Txt></View></View><View style={s.summaryNote}><Inbox size={19} color={colors.accent} /><Txt style={[common.caption, { flex: 1 }]}>{token ? 'Sincronização automática a cada 30 segundos.' : 'Prévia local deste navegador.'}</Txt></View></View>
    <View style={[s.toolbar, width < 900 && s.toolbarSmall]}><View style={[s.search, width < 700 && { width: '100%' }]}><Search size={18} color={colors.muted} /><TextInput accessibilityLabel="Buscar solicitações" placeholder="Nome, projeto, e-mail ou protocolo" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={s.searchInput} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.filters}>{['Todos', 'Recebido', 'Em análise', token ? 'Orçamento enviado' : 'Orçamento simulado', ...(token ? ['Orçamento aprovado', 'Tradutor atribuído', 'Aguardando avaliação', 'Pronta', 'Entregue'] : [])].map(value => <Pressable key={value} accessibilityRole="tab" aria-selected={filter === value} accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[s.filter, filter === value && s.filterActive]}><Txt style={[s.filterText, filter === value && s.filterTextActive]}>{value}</Txt></Pressable>)}</ScrollView>
    </View>
    {!!loadError && <View style={s.errorBox}><Txt accessibilityRole="alert" style={{ color: colors.red }}>{loadError}</Txt><Txt style={common.caption}>Os pedidos não foram atualizados. Confira a conexão ou entre novamente se a sessão expirou.</Txt></View>}
    {!!error && !selected && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
    {!!visible.length && <View style={s.requestList}>{width >= 700 && <View style={s.tableHead}><Txt style={[s.columnLabel, { flex: 1 }]}>Solicitação / Cliente</Txt><Txt style={[s.columnLabel, s.statusColumn]}>Etapa</Txt><Txt style={[s.columnLabel, s.dateColumn]}>Entrada</Txt><View style={{ width: 18 }} /></View>}
      {visible.map(request => <Pressable key={request.id} accessibilityRole="button" accessibilityLabel={`Abrir solicitação ${request.id}: ${request.title}`} disabled={busy} onPress={() => void open(request)} style={({ hovered }) => [s.requestRow, hovered && { backgroundColor: colors.elevated }, width < 700 && s.requestRowSmall]}>
        <View style={s.requestMain}><View style={s.fileGlyph}><FileText size={20} color={colors.accent} /></View><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Txt style={s.requestTitle}>{request.title}</Txt><Txt style={common.caption}>{request.name}{request.company ? ` · ${request.company}` : ''}</Txt><Txt style={s.requestMeta}>{request.source} → {request.target} · {request.attachments.length} {request.attachments.length === 1 ? 'documento' : 'documentos'}</Txt></View></View>
        <View style={[s.requestInfo, width < 700 && s.requestInfoSmall]}><View style={width >= 700 ? s.statusColumn : undefined}><Badge tone={request.status === 'Recebido' ? 'green' : request.status === 'Em análise' ? 'amber' : 'blue'}>{request.status}</Badge></View><Txt style={[common.caption, width >= 700 && s.dateColumn]}>{new Date(request.createdAt).toLocaleDateString('pt-BR')}</Txt><ChevronRight size={17} color={colors.muted} /></View>
      </Pressable>)}
    </View>}
    {!visible.length && !loading && !loadError && <EmptyState icon={Inbox} title={requests.length ? 'Nenhuma solicitação neste filtro' : 'Sua próxima conexão começa no site'} text={requests.length ? 'Tente outro filtro ou uma nova busca.' : 'Os pedidos enviados pelo formulário de orçamento aparecem aqui para análise da equipe.'} />}
    <Dialog open={!!selected} onClose={() => { if (busy) return; if (confirm) setConfirm(false); else close(); }} size="wide" eyebrow={selected?.id} title={confirm ? (token ? 'Revisar e enviar orçamento' : 'Revisar simulação') : 'Detalhes da solicitação'} description={confirm ? 'Confira os dados finais antes de continuar.' : 'Dados recebidos pelo formulário de orçamento.'}>
      {selected && !confirm && <>
        <View style={[s.requestHero, width < 600 && s.requestHeroSmall]}><View style={[s.requestHeroCopy, width < 600 && s.requestHeroCopySmall]}><Badge tone={locked ? 'blue' : selected.status === 'Em análise' ? 'amber' : 'green'}>{selected.status}</Badge><Txt style={[s.detailTitle, width < 600 && s.detailTitleSmall]}>{selected.title}</Txt></View>{selected.status === 'Recebido' && <Button style={width < 600 && s.requestHeroActionSmall} variant="secondary" icon={CheckCircle2} loading={busy} onPress={() => void analyze()}>Iniciar análise</Button>}</View>
        <View style={s.contactStrip}><View style={s.contactAvatar}><Txt style={s.contactInitials}>{selected.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</Txt></View><View style={{ flex: 1, minWidth: 0, gap: 3 }}><Txt style={s.contactName}>{selected.name}</Txt><Txt selectable style={s.contactEmail}>{selected.email}</Txt></View>{!!selected.company && <Txt style={common.caption}>{selected.company}</Txt>}</View>
        <View style={s.detailGrid}>{[['Serviço', selected.service], ['Idiomas', `${selected.source} → ${selected.target}`], ['Prazo desejado', selected.deadline ? formatSelectedDate(selected.deadline) : 'Não informado']].map(([label, value]) => <View key={label} style={s.detailCell}><Txt style={s.detailLabel}>{label}</Txt><Txt style={s.detailValue}>{value}</Txt></View>)}</View>
        <View style={s.sectionBlock}><Txt style={s.sectionEyebrow}>CONTEXTO DO PROJETO</Txt><Txt selectable style={s.projectMessage}>{selected.message}</Txt></View>
        <View style={s.documents}><View style={s.sectionHeading}><View><Txt style={s.sectionEyebrow}>DOCUMENTOS</Txt><Txt style={s.sectionTitle}>{selected.attachments.length} {selected.attachments.length === 1 ? 'arquivo recebido' : 'arquivos recebidos'}</Txt></View><FileText size={21} color={colors.muted} /></View>{selected.attachments.map((file, index) => <Pressable key={file.name + index} accessibilityRole="button" accessibilityLabel={file.name} onPress={() => downloadDocument(file)} style={s.documentRow}><View style={s.documentIcon}><Download size={17} color={colors.accent} /></View><Txt numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: '600' }}>{file.name}</Txt><Txt style={common.caption}>Baixar</Txt></Pressable>)}{!selected.attachments.length && <Txt style={common.caption}>Nenhum documento anexado. Solicite o material ao cliente, se necessário.</Txt>}</View>
        <View style={s.quotePanel}><View style={s.quoteHeading}><View style={s.quoteIcon}><Mail size={20} color={colors.accent} /></View><View style={{ flex: 1 }}><Txt style={s.sectionEyebrow}>{locked ? 'PROPOSTA FINAL' : 'ETAPA COMERCIAL'}</Txt><Txt style={s.quoteTitle}>{locked ? 'Orçamento registrado' : 'Prepare a proposta'}</Txt></View></View>
          <View style={[s.quoteFields, width < 650 && { flexDirection: 'column' }]}><View style={s.quoteField}><Txt style={s.label}>Valor do orçamento (R$)</Txt><TextInput accessibilityLabel="Valor do orçamento (R$)" value={quote.amount} onChangeText={value => { setQuote(current => ({ ...current, amount: value })); setNotice(''); }} placeholder="Ex.: 350,00" placeholderTextColor={colors.muted} editable={!locked && !busy} keyboardType="decimal-pad" maxLength={12} style={s.input} /></View><DateSelectField compact={width < 650} label="Prazo de entrega" value={quote.delivery} onChange={value => { setQuote(current => ({ ...current, delivery: value })); setNotice(''); }} disabled={locked || busy} /></View>
          <View style={s.quoteField}><Txt style={s.label}>Mensagem ao cliente</Txt><TextInput accessibilityLabel="Mensagem ao cliente" value={quote.message} onChangeText={value => { setQuote(current => ({ ...current, message: value })); setNotice(''); }} placeholder="Escopo, condições e próximos passos" placeholderTextColor={colors.muted} editable={!locked && !busy} multiline maxLength={3000} style={[s.input, s.textarea]} /></View>
          {!!notice && <Txt accessibilityLiveRegion="polite" testID="quote-notice" style={s.notice}>{notice}</Txt>}{!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
          {!locked && <View style={s.modalActions}><Button variant="secondary" icon={Save} loading={busy} onPress={() => void save()}>Salvar rascunho</Button><Button icon={Send} disabled={busy} onPress={() => void prepare()}>{token ? 'Revisar e enviar por e-mail' : 'Revisar envio simulado'}</Button></View>}
        </View>
        {selected.status === 'Orçamento enviado' && <View style={s.waiting}><Mail size={20} color={colors.blue} /><View style={{ flex: 1, gap: 4 }}><Txt style={{ fontWeight: '600' }}>Aguardando a resposta do cliente</Txt><Txt style={common.caption}>O e-mail contém links pessoais para aprovar ou recusar. Atualize a lista para consultar a decisão.</Txt></View></View>}
        {selected.status === 'Orçamento recusado' && <View style={s.waiting}><Txt style={{ color: colors.amber }}>O cliente recusou este orçamento. A tarefa não pode ser criada.</Txt></View>}
        {selected.status === 'Orçamento aprovado' && token && !selected.task && <View style={s.assignment}><View style={s.quoteHeading}><View style={s.quoteIcon}><UserCheck size={20} color={colors.accent} /></View><View style={{ flex: 1 }}><Txt style={s.sectionEyebrow}>ALOCAÇÃO</Txt><Txt style={s.quoteTitle}>Escolha o tradutor</Txt></View></View>
          <View style={s.translatorList}>{translators.map(translator => <Pressable key={translator.id} accessibilityRole="radio" accessibilityLabel={`Tradutor: ${translator.name}`} accessibilityState={{ checked: assignment.translatorId === translator.id }} onPress={() => setAssignment(current => ({ ...current, translatorId: translator.id }))} style={[s.translator, assignment.translatorId === translator.id && s.translatorActive]}><View style={[s.radio, assignment.translatorId === translator.id && s.radioActive]} /><View style={{ flex: 1 }}><Txt style={{ fontWeight: '600' }}>{translator.name}</Txt><Txt style={common.caption}>{translator.email}</Txt></View></Pressable>)}</View>
          {!translators.length && <Txt style={common.caption}>Nenhum tradutor ativo. Peça ao administrador para cadastrar ou ativar uma conta de tradutor.</Txt>}
          <DateSelectField compact label="Prazo da tarefa" value={assignment.deadline} onChange={deadline => setAssignment(current => ({ ...current, deadline }))} disabled={busy} />
          <View style={s.quoteField}><Txt style={s.label}>Observações para o tradutor (opcional)</Txt><TextInput accessibilityLabel="Observações para o tradutor" value={assignment.observations} onChangeText={observations => setAssignment(current => ({ ...current, observations }))} placeholder="Escopo, terminologia e cuidados específicos" placeholderTextColor={colors.muted} multiline maxLength={3000} style={[s.input, s.textarea]} /></View>
          <Button icon={UserCheck} loading={busy} disabled={!translators.length} onPress={() => void createTask()}>Criar tarefa e atribuir</Button>
        </View>}
        {selected.task && <View style={s.waiting}><UserCheck size={20} color={colors.green} /><View style={{ flex: 1, gap: 4 }}><Txt style={{ fontWeight: '600' }}>{selected.task.translator.name}</Txt><Txt style={common.caption}>{selected.task.id} · {selected.task.status} · prazo {formatSelectedDate(selected.task.deadline)}</Txt></View></View>}
        {selected.emailSentAt && <Txt style={common.caption}>Aceito pelo provedor em {new Date(selected.emailSentAt).toLocaleString('pt-BR')}. A entrega na caixa de entrada depende do provedor.</Txt>}
        {!!selected.history?.length && <View style={s.history}><View style={common.row}><History size={18} color={colors.accent} /><Txt style={s.sectionEyebrow}>HISTÓRICO</Txt></View>{selected.history.map((event, index) => <View key={`${event.createdAt}-${index}`} style={s.historyRow}><View style={s.historyDot} /><View style={{ flex: 1 }}><Txt style={{ fontSize: 13, fontWeight: '600' }}>{event.status}</Txt><Txt style={common.caption}>{event.actorName} · {new Date(event.createdAt).toLocaleString('pt-BR')}{event.note ? ` · ${event.note}` : ''}</Txt></View></View>)}</View>}
        {!token && <Txt style={common.caption}>Prévia local. A simulação não envia e-mails.</Txt>}
        <View style={s.modalActions}><Button variant="ghost" disabled={busy} onPress={close}>Fechar solicitação</Button></View>
      </>}
      {confirm && <>
      <View style={s.reviewBanner}><Badge tone="amber">{token ? 'Confira antes de enviar' : 'Prévia local · nenhum e-mail será enviado'}</Badge><Txt style={common.caption}>Depois da confirmação, o status desta solicitação será atualizado.</Txt></View>
      <View style={s.reviewRecipient}><Txt style={s.detailLabel}>DESTINATÁRIO</Txt><Txt selectable style={s.reviewEmail}>{selected?.email}</Txt><Txt style={s.reviewTitle}>{selected?.title}</Txt></View>
      <View style={s.reviewTerms}><View><Txt style={s.detailLabel}>VALOR</Txt><Txt style={s.reviewAmount}>{money(quote.amount)}</Txt></View><View><Txt style={s.detailLabel}>PRAZO</Txt><Txt style={s.detailValue}>{formatSelectedDate(quote.delivery)}</Txt></View></View>
      <View style={s.sectionBlock}><Txt style={s.sectionEyebrow}>MENSAGEM AO CLIENTE</Txt><Txt style={s.projectMessage}>{quote.message}</Txt></View>{!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
      <View style={s.modalActions}><Button variant="secondary" disabled={busy} onPress={() => setConfirm(false)}>Voltar e editar</Button><Button icon={ArrowUpRight} loading={busy} onPress={() => void send()}>{token ? 'Confirmar envio' : 'Confirmar simulação'}</Button></View>
      </>}
    </Dialog>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { padding: 40, flexGrow: 1 },
  summary: { minHeight: 126, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24, paddingHorizontal: 26, paddingVertical: 22, marginBottom: 24, backgroundColor: '#0D0D0F', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, summarySmall: { alignItems: 'flex-start', flexDirection: 'column', gap: 16 },
  summaryCount: { flexDirection: 'row', alignItems: 'center', gap: 18 }, summaryNumber: { minWidth: 48, fontSize: 48, lineHeight: 54, fontWeight: '700', letterSpacing: -2, color: colors.accent }, summaryLabel: { fontSize: 10, lineHeight: 16, letterSpacing: 2, color: colors.muted, fontWeight: '600' }, summaryTitle: { fontSize: 19, lineHeight: 27, fontWeight: '600' }, summaryNote: { maxWidth: 330, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolbar: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 12 }, toolbarSmall: { alignItems: 'stretch', flexDirection: 'column', gap: 4 },
  search: { width: 380, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#48484F' }, searchInput: { flex: 1, minWidth: 0, minHeight: 48, fontFamily: font, fontSize: 14, color: colors.ink, outlineWidth: 0 }, filters: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 }, filter: { minHeight: 38, justifyContent: 'center', borderRadius: 10, paddingHorizontal: 13 }, filterActive: { backgroundColor: colors.accentSoft }, filterText: { fontSize: 13, color: colors.muted }, filterTextActive: { color: colors.accent, fontWeight: '600' },
  requestList: { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, tableHead: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 20, backgroundColor: '#0B0B0D', borderBottomWidth: 1, borderBottomColor: colors.line }, columnLabel: { fontSize: 10, lineHeight: 16, letterSpacing: 1.4, color: colors.muted, fontWeight: '600' }, statusColumn: { width: 160 }, dateColumn: { width: 90 },
  requestRow: { minHeight: 98, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line }, requestRowSmall: { alignItems: 'stretch', flexDirection: 'column', gap: 14, paddingHorizontal: 18 }, requestMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14 }, fileGlyph: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, requestInfo: { flexDirection: 'row', alignItems: 'center', gap: 18 }, requestInfoSmall: { justifyContent: 'space-between' }, requestTitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' }, requestMeta: { fontSize: 12, lineHeight: 18, color: '#777780' },
  requestHero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: colors.line }, requestHeroSmall: { alignItems: 'stretch', flexDirection: 'column' }, requestHeroCopy: { flex: 1, minWidth: 0, gap: 10 }, requestHeroCopySmall: { flex: 0, width: '100%' }, requestHeroActionSmall: { alignSelf: 'stretch' }, detailTitle: { maxWidth: 650, fontSize: 30, lineHeight: 38, letterSpacing: -0.8, fontWeight: '700' }, detailTitleSmall: { fontSize: 25, lineHeight: 32, letterSpacing: -0.5 },
  contactStrip: { minHeight: 76, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, paddingVertical: 12 }, contactAvatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: '#572234', alignItems: 'center', justifyContent: 'center' }, contactInitials: { fontSize: 12, color: colors.accent, fontWeight: '700' }, contactName: { fontSize: 17, lineHeight: 24, fontWeight: '600' }, contactEmail: { fontSize: 13, lineHeight: 19, color: colors.accent },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.line }, detailCell: { flex: 1, minWidth: 180, minHeight: 84, justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 13, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, detailLabel: { fontSize: 9, lineHeight: 15, letterSpacing: 1.5, color: colors.muted, fontWeight: '600' }, detailValue: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  sectionBlock: { gap: 9, paddingHorizontal: 18, paddingVertical: 17, backgroundColor: colors.canvas, borderLeftWidth: 3, borderLeftColor: '#5B2638' }, sectionEyebrow: { fontSize: 9, lineHeight: 15, letterSpacing: 1.6, color: colors.accent, fontWeight: '600' }, sectionTitle: { marginTop: 2, fontSize: 17, lineHeight: 24, fontWeight: '600' }, projectMessage: { fontSize: 14, lineHeight: 23 },
  documents: { gap: 10 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 5 }, documentRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, documentIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  quotePanel: { gap: 18, padding: 22, backgroundColor: '#0B0B0D', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, quoteHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, quoteIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, quoteTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700' }, quoteFields: { flexDirection: 'row', gap: 14 }, quoteField: { flex: 1, minWidth: 0, gap: 8 }, label: { fontSize: 12, lineHeight: 18, color: '#CBCBD0', fontWeight: '600' }, input: { minHeight: 50, borderRadius: 11, backgroundColor: colors.canvas, borderWidth: 1, borderColor: '#39393E', paddingHorizontal: 14, fontFamily: font, fontSize: 14, color: colors.ink, outlineWidth: 0 }, textarea: { minHeight: 116, paddingVertical: 13, textAlignVertical: 'top' }, modalActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 17, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  assignment: { gap: 16, padding: 22, backgroundColor: '#0B0B0D', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, translatorList: { gap: 8 }, translator: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 13 }, translatorActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.muted }, radioActive: { borderWidth: 5, borderColor: colors.accent },
  history: { gap: 10, paddingTop: 10 }, historyRow: { flexDirection: 'row', gap: 11, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line }, historyDot: { width: 8, height: 8, marginTop: 5, borderRadius: 4, backgroundColor: colors.accent },
  reviewBanner: { gap: 10, padding: 16, backgroundColor: colors.amberSoft, borderLeftWidth: 3, borderLeftColor: colors.amber }, reviewRecipient: { gap: 5, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.line }, reviewEmail: { fontSize: 14, color: colors.accent, fontWeight: '600' }, reviewTitle: { marginTop: 8, fontSize: 24, lineHeight: 31, fontWeight: '700' }, reviewTerms: { flexDirection: 'row', flexWrap: 'wrap', gap: 36, paddingVertical: 4 }, reviewAmount: { marginTop: 3, fontSize: 30, lineHeight: 37, color: colors.accent, fontWeight: '700' },
  errorBox: { gap: 10, padding: 20, backgroundColor: colors.redSoft, borderRadius: 20 }, error: { color: colors.red, fontSize: 14, lineHeight: 22 }, notice: { color: colors.green, fontSize: 14, lineHeight: 22 },
});
