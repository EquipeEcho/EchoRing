import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { ArrowUpRight, CheckCircle2, ChevronRight, Download, FileText, Inbox, Mail, RefreshCw, Save, Search, Send } from 'lucide-react-native';
import { Badge, Button, EmptyState, PageHeading, Txt, common } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { colors, font } from '@/constants/design';
import { useSession } from '@/features/auth/session';
import { downloadDocument, getRequest, money, sendQuote, updateRequest, type Quote, type TranslationRequest } from './service';
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
  const locked = selected?.status === 'Orçamento enviado' || selected?.status === 'Orçamento simulado';
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = requests.filter(item => (filter === 'Todos' || item.status === filter) && normalize(item.title + item.name + item.email + item.id).includes(normalize(search)));
  async function open(request: TranslationRequest) {
    setError(''); setNotice(''); setBusy(true);
    try { const detail = await getRequest(request.id, token); setSelected(detail); setQuote(detail.quote ?? { ...emptyQuote }); }
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
    if (!/^\d{1,8}([.,]\d{1,2})?$/.test(quote.amount.trim()) || Number(quote.amount.replace(',', '.')) <= 0 || !quote.delivery.trim() || !quote.message.trim()) {
      setError('Informe um valor positivo, o prazo de entrega e a mensagem ao cliente.'); return false;
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
      setSelected(result); setConfirm(false); setNotice(token ? 'Orçamento aceito pelo provedor de e-mail para envio ao cliente.' : 'Envio simulado. Nenhum e-mail foi enviado ao cliente.'); await refresh();
    } catch (failure) { setConfirm(false); setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  function close() { if (!busy) { setSelected(null); setError(''); setNotice(''); } }
  return <ScrollView contentContainerStyle={[s.page, width < 700 && { padding: 20 }]} keyboardShouldPersistTaps="handled">
    <PageHeading title="Solicitações" subtitle="Da primeira mensagem ao orçamento. Tudo começa aqui." action={<Button variant="secondary" icon={RefreshCw} loading={loading} onPress={() => void refresh()}>Atualizar</Button>} />
    <View style={s.summary}><View style={s.summaryIcon}><Inbox size={25} color={colors.accent} /></View><View style={{ flex: 1, gap: 4 }}><Txt style={{ fontSize: 20, fontWeight: '600' }}>{requests.filter(item => item.status === 'Recebido').length} pedidos aguardando análise</Txt><Txt style={common.caption}>{token ? 'Pedidos enviados pelo site da Aliança Traduções. Atualização automática a cada 30 segundos.' : 'Prévia local: pedidos deste navegador. Entre com uma conta da equipe para acessar solicitações reais.'}</Txt></View></View>
    <View style={s.search}><Search size={18} color={colors.muted} /><TextInput accessibilityLabel="Buscar solicitações" placeholder="Nome, projeto, e-mail ou protocolo" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={s.searchInput} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{['Todos', 'Recebido', 'Em análise', token ? 'Orçamento enviado' : 'Orçamento simulado'].map(value => <Pressable key={value} accessibilityRole="tab" aria-selected={filter === value} accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[s.filter, filter === value && { backgroundColor: colors.navigationActive }]}><Txt style={{ fontSize: 14, color: filter === value ? colors.accent : colors.muted }}>{value}</Txt></Pressable>)}</ScrollView>
    {!!loadError && <View style={s.errorBox}><Txt accessibilityRole="alert" style={{ color: colors.red }}>{loadError}</Txt><Txt style={common.caption}>Os pedidos não foram atualizados. Confira a conexão ou entre novamente se a sessão expirou.</Txt></View>}
    {!!error && !selected && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
    {visible.map(request => <Pressable key={request.id} accessibilityRole="button" accessibilityLabel={`Abrir solicitação ${request.id}: ${request.title}`} disabled={busy} onPress={() => void open(request)} style={({ hovered }) => [s.requestRow, hovered && { backgroundColor: colors.surface }, width < 700 && { flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={[common.row, { flex: 1, minWidth: 0, gap: 16 }]}><FileText size={26} color={colors.accent} /><View style={{ flex: 1, gap: 5 }}><Txt style={s.requestTitle}>{request.title}</Txt><Txt style={common.caption}>{request.name}{request.company ? ` · ${request.company}` : ''}</Txt><Txt style={common.caption}>{request.source} → {request.target} · {request.attachments.length} {request.attachments.length === 1 ? 'documento' : 'documentos'}</Txt></View></View>
      <View style={[common.row, { justifyContent: 'space-between' }]}><Badge tone={request.status === 'Recebido' ? 'green' : request.status === 'Em análise' ? 'amber' : 'blue'}>{request.status}</Badge><Txt style={common.caption}>{new Date(request.createdAt).toLocaleDateString('pt-BR')}</Txt><ChevronRight size={17} color={colors.muted} /></View>
    </Pressable>)}
    {!visible.length && !loading && !loadError && <EmptyState icon={Inbox} title={requests.length ? 'Nenhuma solicitação neste filtro' : 'Sua próxima conexão começa no site'} text={requests.length ? 'Tente outro filtro ou uma nova busca.' : 'Os pedidos enviados pelo formulário de orçamento aparecem aqui para análise da equipe.'} />}
    <Dialog open={!!selected} onClose={() => { if (busy) return; if (confirm) setConfirm(false); else close(); }} title={confirm ? (token ? 'Enviar or\u00e7amento' : 'Simular envio') : selected?.id ?? 'Solicitação'}>
      {selected && !confirm && <>
        <Badge tone={locked ? 'blue' : 'green'}>{selected.status}</Badge><Txt style={s.detailTitle}>{selected.title}</Txt>
        <View style={s.customer}><Txt style={{ fontSize: 18, fontWeight: '600' }}>{selected.name}</Txt><Txt selectable style={{ color: colors.accent }}>{selected.email}</Txt>{!!selected.company && <Txt style={common.caption}>{selected.company}</Txt>}</View>
        {[['Serviço', selected.service], ['Idiomas', `${selected.source} → ${selected.target}`], ['Prazo desejado', selected.deadline || 'Não informado']].map(([label, value]) => <View key={label} style={s.detailRow}><Txt style={common.caption}>{label}</Txt><Txt style={{ flex: 1, textAlign: 'right', fontSize: 14 }}>{value}</Txt></View>)}
        <View style={s.message}><Txt style={s.label}>Sobre o projeto</Txt><Txt selectable style={{ fontSize: 15, lineHeight: 24 }}>{selected.message}</Txt></View>
        <Txt style={s.label}>Documentos ({selected.attachments.length})</Txt>{selected.attachments.map((file, index) => <Button key={file.name + index} variant="secondary" icon={Download} onPress={() => downloadDocument(file)}>{file.name}</Button>)}{!selected.attachments.length && <Txt style={common.caption}>Nenhum documento anexado. Solicite o material ao cliente, se necessário.</Txt>}
        {selected.status === 'Recebido' && <Button variant="secondary" icon={CheckCircle2} loading={busy} onPress={() => void analyze()}>Iniciar análise</Button>}
        <View style={s.quoteHeading}><Mail size={21} color={colors.accent} /><Txt style={{ fontSize: 22, fontWeight: '600' }}>{locked ? 'Orçamento registrado' : 'Prepare a proposta'}</Txt></View>
        {[{ key: 'amount' as const, label: 'Valor do orçamento (R$)', placeholder: 'Ex.: 350,00' }, { key: 'delivery' as const, label: 'Prazo de entrega', placeholder: 'Ex.: 5 dias úteis após a aprovação' }, { key: 'message' as const, label: 'Mensagem ao cliente', placeholder: 'Escopo, condições e próximos passos' }].map(field => <View key={field.key} style={{ gap: 8 }}><Txt style={s.label}>{field.label}</Txt><TextInput accessibilityLabel={field.label} value={quote[field.key]} onChangeText={value => { setQuote(current => ({ ...current, [field.key]: value })); setNotice(''); }} placeholder={field.placeholder} placeholderTextColor={colors.muted} editable={!locked && !busy} keyboardType={field.key === 'amount' ? 'decimal-pad' : 'default'} multiline={field.key === 'message'} maxLength={field.key === 'message' ? 3000 : field.key === 'amount' ? 12 : 160} style={[s.input, field.key === 'message' && { minHeight: 130, paddingVertical: 14, textAlignVertical: 'top' }]} /></View>)}
        {!!notice && <Txt accessibilityLiveRegion="polite" testID="quote-notice" style={s.notice}>{notice}</Txt>}{!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
        {!locked && <><Button variant="secondary" icon={Save} loading={busy} onPress={() => void save()}>Salvar rascunho</Button><Button icon={Send} disabled={busy} onPress={() => void prepare()}>{token ? 'Revisar e enviar por e-mail' : 'Revisar envio simulado'}</Button></>}
        {selected.emailSentAt && <Txt style={common.caption}>Aceito pelo provedor em {new Date(selected.emailSentAt).toLocaleString('pt-BR')}. A entrega na caixa de entrada depende do provedor.</Txt>}
        {!token && <Txt style={common.caption}>Prévia local. A simulação não envia e-mails.</Txt>}
        <Button variant="ghost" disabled={busy} onPress={close}>Fechar solicitação</Button>
      </>}
      {confirm && <>
      <Badge tone="amber">{token ? 'Confira antes de enviar' : 'Prévia local · nenhum e-mail será enviado'}</Badge>
      <Txt style={common.caption}>Destinatário</Txt><Txt selectable style={{ fontWeight: '600' }}>{selected?.email}</Txt><Txt style={s.detailTitle}>{selected?.title}</Txt><Txt style={{ color: colors.accent, fontSize: 28, fontWeight: '600' }}>{money(quote.amount)}</Txt><Txt>{quote.delivery}</Txt><Txt style={s.message}>{quote.message}</Txt>{!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
      <Button icon={ArrowUpRight} loading={busy} onPress={() => void send()}>{token ? 'Confirmar envio' : 'Confirmar simulação'}</Button><Button variant="secondary" disabled={busy} onPress={() => setConfirm(false)}>Voltar e editar</Button>
      </>}
    </Dialog>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { padding: 40, flexGrow: 1 }, summary: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.surface, borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 22, marginBottom: 26 }, summaryIcon: { height: 48, width: 48, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 26, paddingHorizontal: 18, backgroundColor: colors.surface, maxWidth: 500 }, searchInput: { flex: 1, minWidth: 0, minHeight: 50, fontFamily: font, fontSize: 15, color: colors.ink, outlineWidth: 0 }, filters: { flexDirection: 'row', gap: 6, paddingVertical: 20 }, filter: { borderRadius: 24, backgroundColor: colors.surface, paddingVertical: 11, paddingHorizontal: 17 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 24, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.line }, requestTitle: { fontSize: 19, lineHeight: 26, fontWeight: '500' }, detailTitle: { fontSize: 26, lineHeight: 33, fontWeight: '600' }, customer: { gap: 6, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 }, message: { backgroundColor: colors.canvas, padding: 18, borderRadius: 16, gap: 10 }, label: { fontSize: 14, fontWeight: '600' }, quoteHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.line }, input: { minHeight: 52, borderRadius: 15, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, fontFamily: font, fontSize: 16, color: colors.ink },
  errorBox: { gap: 10, padding: 20, backgroundColor: colors.redSoft, borderRadius: 20 }, error: { color: colors.red, fontSize: 14, lineHeight: 22 }, notice: { color: colors.green, fontSize: 14, lineHeight: 22 },
});
