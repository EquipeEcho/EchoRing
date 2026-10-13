import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  History,
  Inbox,
  Mail,
  RefreshCw,
  Save,
  Search,
  Send,
  UserCheck,
} from 'lucide-react-native';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { DateSelectField } from '@/components/ui/fields/date-select-field';
import { formatSelectedDate } from '@/components/ui/fields/date-utils';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useRequestWorkflow } from '@/features/requests/hooks/use-request-workflow';
import { useStyles } from '@/features/requests/styles/requests.styles';
import { downloadDocument } from '@/lib/documents/download';
import { useCommonStyles } from '@/theme/common.styles';
import { money } from '@/utils/formatters';
import { useTheme } from '@/theme/theme-context';

export function RequestsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  const {
    loading,
    refresh,
    requests,
    token,
    view,
    setView,
    setFilter,
    activeRequests,
    completedRequests,
    search,
    setSearch,
    statusFilters,
    filter,
    loadError,
    error,
    selected,
    visible,
    busy,
    open,
    scopedRequests,
    confirm,
    setConfirm,
    close,
    locked,
    analyze,
    quote,
    setQuote,
    setNotice,
    notice,
    save,
    prepare,
    translators,
    assignment,
    setAssignment,
    createTask,
    send,
  } = useRequestWorkflow();
  return (
    <ScrollView
      contentContainerStyle={[styles.page, width < 700 && { padding: 20 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <PageHeading
        title="Solicitações"
        subtitle="Da primeira mensagem ao orçamento. Tudo começa aqui."
        action={
          <Button
            variant="secondary"
            icon={RefreshCw}
            loading={loading}
            onPress={() => void refresh()}
          >
            Atualizar
          </Button>
        }
      />
      <View style={[styles.summary, width < 700 && styles.summarySmall]}>
        <View style={styles.summaryCount}>
          <Txt style={styles.summaryNumber}>
            {requests.filter((item) => item.status === 'Recebido').length}
          </Txt>
          <View>
            <Txt style={styles.summaryLabel}>AGUARDANDO ANÁLISE</Txt>
            <Txt style={styles.summaryTitle}>Novos pedidos do site</Txt>
          </View>
        </View>
        <View style={styles.summaryNote}>
          <Inbox size={19} color={colors.accent} />
          <Txt style={[common.caption, { flex: 1 }]}>
            {token
              ? 'Sincronização automática a cada 30 segundos.'
              : 'Prévia local deste navegador.'}
          </Txt>
        </View>
      </View>
      <View style={styles.flowTabs}>
        <Pressable
          accessibilityRole="tab"
          aria-selected={view === 'active'}
          accessibilityState={{ selected: view === 'active' }}
          onPress={() => {
            setView('active');
            setFilter('Todos');
          }}
          style={[styles.flowTab, view === 'active' && styles.flowTabActive]}
        >
          <Txt style={[styles.flowTabText, view === 'active' && styles.flowTabTextActive]}>
            Em andamento ({activeRequests.length})
          </Txt>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          aria-selected={view === 'completed'}
          accessibilityState={{ selected: view === 'completed' }}
          onPress={() => {
            setView('completed');
            setFilter('Todos');
          }}
          style={[styles.flowTab, view === 'completed' && styles.flowTabActive]}
        >
          <Txt style={[styles.flowTabText, view === 'completed' && styles.flowTabTextActive]}>
            Concluídas ({completedRequests.length})
          </Txt>
        </Pressable>
      </View>
      <View style={[styles.toolbar, width < 900 && styles.toolbarSmall]}>
        <View testID="search-field" style={[styles.search, width < 700 && { width: '100%' }]}>
          <Search size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="Buscar solicitações"
            placeholder="Nome, projeto, e-mail ou protocolo"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {statusFilters.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              aria-selected={filter === value}
              accessibilityState={{ selected: filter === value }}
              onPress={() => setFilter(value)}
              style={[styles.filter, filter === value && styles.filterActive]}
            >
              <Txt style={[styles.filterText, filter === value && styles.filterTextActive]}>
                {value}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {!!loadError && (
        <View style={styles.errorBox}>
          <Txt accessibilityRole="alert" style={{ color: colors.red }}>
            {loadError}
          </Txt>
          <Txt style={common.caption}>
            Os pedidos não foram atualizados. Confira a conexão ou entre novamente se a sessão
            expirou.
          </Txt>
        </View>
      )}
      {!!error && !selected && (
        <Txt accessibilityRole="alert" style={styles.error}>
          {error}
        </Txt>
      )}
      {!!visible.length && (
        <View style={styles.requestList}>
          {width >= 700 && (
            <View style={styles.tableHead}>
              <Txt style={[styles.columnLabel, { flex: 1 }]}>Solicitação / Cliente</Txt>
              <Txt style={[styles.columnLabel, styles.statusColumn]}>Etapa</Txt>
              <Txt style={[styles.columnLabel, styles.dateColumn]}>Entrada</Txt>
              <View style={{ width: 18 }} />
            </View>
          )}
          {visible.map((request) => (
            <Pressable
              key={request.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir solicitação ${request.id}: ${request.title}`}
              disabled={busy}
              onPress={() => void open(request)}
              style={({ hovered }) => [
                styles.requestRow,
                hovered && { backgroundColor: colors.elevated },
                width < 700 && styles.requestRowSmall,
              ]}
            >
              <View style={styles.requestMain}>
                <View style={styles.fileGlyph}>
                  <FileText size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Txt style={styles.requestTitle}>{request.title}</Txt>
                  <Txt style={common.caption}>
                    {request.name}
                    {request.company ? ` · ${request.company}` : ''}
                  </Txt>
                  <Txt style={styles.requestMeta}>
                    {request.source} → {request.target} · {request.attachments.length}{' '}
                    {request.attachments.length === 1 ? 'documento' : 'documentos'}
                  </Txt>
                </View>
              </View>
              <View style={[styles.requestInfo, width < 700 && styles.requestInfoSmall]}>
                <View style={width >= 700 ? styles.statusColumn : undefined}>
                  <Badge
                    tone={
                      request.status === 'Recebido'
                        ? 'green'
                        : request.status === 'Em análise'
                          ? 'amber'
                          : 'blue'
                    }
                  >
                    {request.status}
                  </Badge>
                </View>
                <Txt style={[common.caption, width >= 700 && styles.dateColumn]}>
                  {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                </Txt>
                <ChevronRight size={17} color={colors.muted} />
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {!visible.length && !loading && !loadError && (
        <EmptyState
          icon={view === 'completed' ? CheckCircle2 : Inbox}
          title={
            scopedRequests.length
              ? 'Nenhuma solicitação neste filtro'
              : view === 'completed'
                ? 'Nenhuma solicitação concluída'
                : 'Sua próxima conexão começa no site'
          }
          text={
            scopedRequests.length
              ? 'Tente outro filtro ou uma nova busca.'
              : view === 'completed'
                ? 'Solicitações entregues ou encerradas ficam organizadas nesta aba.'
                : 'Os pedidos enviados pelo formulário de orçamento aparecem aqui para análise da equipe.'
          }
        />
      )}
      <Dialog
        open={!!selected}
        onClose={() => {
          if (busy) return;
          if (confirm) setConfirm(false);
          else close();
        }}
        size="wide"
        eyebrow={selected?.id}
        title={
          confirm
            ? token
              ? 'Revisar e enviar orçamento'
              : 'Revisar simulação'
            : 'Detalhes da solicitação'
        }
        description={
          confirm
            ? 'Confira os dados finais antes de continuar.'
            : 'Dados recebidos pelo formulário de orçamento.'
        }
      >
        {selected && !confirm && (
          <>
            <View style={[styles.requestHero, width < 600 && styles.requestHeroSmall]}>
              <View style={[styles.requestHeroCopy, width < 600 && styles.requestHeroCopySmall]}>
                <Badge
                  tone={locked ? 'blue' : selected.status === 'Em análise' ? 'amber' : 'green'}
                >
                  {selected.status}
                </Badge>
                <Txt style={[styles.detailTitle, width < 600 && styles.detailTitleSmall]}>
                  {selected.title}
                </Txt>
              </View>
              {selected.status === 'Recebido' && (
                <Button
                  style={width < 600 && styles.requestHeroActionSmall}
                  variant="secondary"
                  icon={CheckCircle2}
                  loading={busy}
                  onPress={() => void analyze()}
                >
                  Iniciar análise
                </Button>
              )}
            </View>
            <View style={styles.contactStrip}>
              <View style={styles.contactAvatar}>
                <Txt style={styles.contactInitials}>
                  {selected.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </Txt>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Txt style={styles.contactName}>{selected.name}</Txt>
                <Txt selectable style={styles.contactEmail}>
                  {selected.email}
                </Txt>
              </View>
              {!!selected.company && <Txt style={common.caption}>{selected.company}</Txt>}
            </View>
            <View style={styles.detailGrid}>
              {[
                ['Serviço', selected.service],
                ['Idiomas', `${selected.source} → ${selected.target}`],
                [
                  'Prazo desejado',
                  selected.deadline ? formatSelectedDate(selected.deadline) : 'Não informado',
                ],
              ].map(([label, value]) => (
                <View key={label} style={styles.detailCell}>
                  <Txt style={styles.detailLabel}>{label}</Txt>
                  <Txt style={styles.detailValue}>{value}</Txt>
                </View>
              ))}
            </View>
            <View style={styles.sectionBlock}>
              <Txt style={styles.sectionEyebrow}>CONTEXTO DO PROJETO</Txt>
              <Txt selectable style={styles.projectMessage}>
                {selected.message}
              </Txt>
            </View>
            <View style={styles.documents}>
              <View style={styles.sectionHeading}>
                <View>
                  <Txt style={styles.sectionEyebrow}>DOCUMENTOS</Txt>
                  <Txt style={styles.sectionTitle}>
                    {selected.attachments.length}{' '}
                    {selected.attachments.length === 1 ? 'arquivo recebido' : 'arquivos recebidos'}
                  </Txt>
                </View>
                <FileText size={21} color={colors.muted} />
              </View>
              {selected.attachments.map((file, index) => (
                <Pressable
                  key={file.name + index}
                  accessibilityRole="button"
                  accessibilityLabel={file.name}
                  onPress={() => downloadDocument(file)}
                  style={styles.documentRow}
                >
                  <View style={styles.documentIcon}>
                    <Download size={17} color={colors.accent} />
                  </View>
                  <Txt numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: '600' }}>
                    {file.name}
                  </Txt>
                  <Txt style={common.caption}>Baixar</Txt>
                </Pressable>
              ))}
              {!selected.attachments.length && (
                <Txt style={common.caption}>
                  Nenhum documento anexado. Solicite o material ao cliente, se necessário.
                </Txt>
              )}
            </View>
            <View style={styles.quotePanel}>
              <View style={styles.quoteHeading}>
                <View style={styles.quoteIcon}>
                  <Mail size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={styles.sectionEyebrow}>
                    {locked ? 'PROPOSTA FINAL' : 'ETAPA COMERCIAL'}
                  </Txt>
                  <Txt style={styles.quoteTitle}>
                    {locked ? 'Orçamento registrado' : 'Prepare a proposta'}
                  </Txt>
                </View>
              </View>
              <View style={[styles.quoteFields, width < 650 && { flexDirection: 'column' }]}>
                <View style={styles.quoteField}>
                  <Txt style={styles.label}>Valor do orçamento (R$)</Txt>
                  <TextInput
                    accessibilityLabel="Valor do orçamento (R$)"
                    value={quote.amount}
                    onChangeText={(value) => {
                      setQuote((current) => ({ ...current, amount: value }));
                      setNotice('');
                    }}
                    placeholder="Ex.: 350,00"
                    placeholderTextColor={colors.muted}
                    editable={!locked && !busy}
                    keyboardType="decimal-pad"
                    maxLength={12}
                    style={styles.input}
                  />
                </View>
                <DateSelectField
                  compact={width < 650}
                  label="Prazo de entrega"
                  value={quote.delivery}
                  onChange={(value) => {
                    setQuote((current) => ({ ...current, delivery: value }));
                    setNotice('');
                  }}
                  disabled={locked || busy}
                />
              </View>
              <View style={styles.quoteField}>
                <Txt style={styles.label}>Mensagem ao cliente</Txt>
                <TextInput
                  accessibilityLabel="Mensagem ao cliente"
                  value={quote.message}
                  onChangeText={(value) => {
                    setQuote((current) => ({ ...current, message: value }));
                    setNotice('');
                  }}
                  placeholder="Escopo, condições e próximos passos"
                  placeholderTextColor={colors.muted}
                  editable={!locked && !busy}
                  multiline
                  maxLength={3000}
                  style={[styles.input, styles.textarea]}
                />
              </View>
              {!!notice && (
                <Txt accessibilityLiveRegion="polite" testID="quote-notice" style={styles.notice}>
                  {notice}
                </Txt>
              )}
              {!!error && (
                <Txt accessibilityRole="alert" style={styles.error}>
                  {error}
                </Txt>
              )}
              {!locked && (
                <View style={styles.modalActions}>
                  <Button
                    variant="secondary"
                    icon={Save}
                    loading={busy}
                    onPress={() => void save()}
                  >
                    Salvar rascunho
                  </Button>
                  <Button icon={Send} disabled={busy} onPress={() => void prepare()}>
                    {token ? 'Revisar e enviar por e-mail' : 'Revisar envio simulado'}
                  </Button>
                </View>
              )}
            </View>
            {selected.status === 'Orçamento enviado' && (
              <View style={styles.waiting}>
                <Mail size={20} color={colors.blue} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt style={{ fontWeight: '600' }}>Aguardando a resposta do cliente</Txt>
                  <Txt style={common.caption}>
                    O e-mail contém links pessoais para aprovar ou recusar. Atualize a lista para
                    consultar a decisão.
                  </Txt>
                </View>
              </View>
            )}
            {selected.status === 'Orçamento recusado' && (
              <View style={styles.waiting}>
                <Txt style={{ color: colors.amber }}>
                  O cliente recusou este orçamento. A tarefa não pode ser criada.
                </Txt>
              </View>
            )}
            {selected.status === 'Orçamento aprovado' && token && !selected.task && (
              <View style={styles.assignment}>
                <View style={styles.quoteHeading}>
                  <View style={styles.quoteIcon}>
                    <UserCheck size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt style={styles.sectionEyebrow}>ALOCAÇÃO</Txt>
                    <Txt style={styles.quoteTitle}>Escolha o tradutor</Txt>
                  </View>
                </View>
                <View style={styles.translatorList}>
                  {translators.map((translator) => (
                    <Pressable
                      key={translator.id}
                      accessibilityRole="radio"
                      accessibilityLabel={`Tradutor: ${translator.name}`}
                      accessibilityState={{ checked: assignment.translatorId === translator.id }}
                      onPress={() =>
                        setAssignment((current) => ({ ...current, translatorId: translator.id }))
                      }
                      style={[
                        styles.translator,
                        assignment.translatorId === translator.id && styles.translatorActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          assignment.translatorId === translator.id && styles.radioActive,
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Txt style={{ fontWeight: '600' }}>{translator.name}</Txt>
                        <Txt style={common.caption}>{translator.email}</Txt>
                      </View>
                    </Pressable>
                  ))}
                </View>
                {!translators.length && (
                  <Txt style={common.caption}>
                    Nenhum tradutor ativo. Peça ao administrador para cadastrar ou ativar uma conta
                    de tradutor.
                  </Txt>
                )}
                <DateSelectField
                  compact
                  label="Prazo da tarefa"
                  value={assignment.deadline}
                  onChange={(deadline) => setAssignment((current) => ({ ...current, deadline }))}
                  disabled={busy}
                />
                <View style={styles.quoteField}>
                  <Txt style={styles.label}>Observações para o tradutor (opcional)</Txt>
                  <TextInput
                    accessibilityLabel="Observações para o tradutor"
                    value={assignment.observations}
                    onChangeText={(observations) =>
                      setAssignment((current) => ({ ...current, observations }))
                    }
                    placeholder="Escopo, terminologia e cuidados específicos"
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={3000}
                    style={[styles.input, styles.textarea]}
                  />
                </View>
                <Button
                  icon={UserCheck}
                  loading={busy}
                  disabled={!translators.length}
                  onPress={() => void createTask()}
                >
                  Criar tarefa e atribuir
                </Button>
              </View>
            )}
            {selected.task && (
              <View style={styles.waiting}>
                <UserCheck size={20} color={colors.green} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt style={{ fontWeight: '600' }}>{selected.task.translator.name}</Txt>
                  <Txt style={common.caption}>
                    {selected.task.id} · {selected.task.status} · prazo{' '}
                    {formatSelectedDate(selected.task.deadline)}
                  </Txt>
                </View>
              </View>
            )}
            {selected.emailSentAt && (
              <Txt style={common.caption}>
                Aceito pelo provedor em {new Date(selected.emailSentAt).toLocaleString('pt-BR')}. A
                entrega na caixa de entrada depende do provedor.
              </Txt>
            )}
            {!!selected.history?.length && (
              <View style={styles.history}>
                <View style={common.row}>
                  <History size={18} color={colors.accent} />
                  <Txt style={styles.sectionEyebrow}>HISTÓRICO</Txt>
                </View>
                {selected.history.map((event, index) => (
                  <View key={`${event.createdAt}-${index}`} style={styles.historyRow}>
                    <View style={styles.historyDot} />
                    <View style={{ flex: 1 }}>
                      <Txt style={{ fontSize: 13, fontWeight: '600' }}>{event.status}</Txt>
                      <Txt style={common.caption}>
                        {event.actorName} · {new Date(event.createdAt).toLocaleString('pt-BR')}
                        {event.note ? ` · ${event.note}` : ''}
                      </Txt>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {!token && (
              <Txt style={common.caption}>Prévia local. A simulação não envia e-mails.</Txt>
            )}
            <View style={styles.modalActions}>
              <Button variant="ghost" disabled={busy} onPress={close}>
                Fechar solicitação
              </Button>
            </View>
          </>
        )}
        {confirm && (
          <>
            <View style={styles.reviewBanner}>
              <Badge tone="amber">
                {token ? 'Confira antes de enviar' : 'Prévia local · nenhum e-mail será enviado'}
              </Badge>
              <Txt style={common.caption}>
                Depois da confirmação, o status desta solicitação será atualizado.
              </Txt>
            </View>
            <View style={styles.reviewRecipient}>
              <Txt style={styles.detailLabel}>DESTINATÁRIO</Txt>
              <Txt selectable style={styles.reviewEmail}>
                {selected?.email}
              </Txt>
              <Txt style={styles.reviewTitle}>{selected?.title}</Txt>
            </View>
            <View style={styles.reviewTerms}>
              <View>
                <Txt style={styles.detailLabel}>VALOR</Txt>
                <Txt style={styles.reviewAmount}>{money(quote.amount)}</Txt>
              </View>
              <View>
                <Txt style={styles.detailLabel}>PRAZO</Txt>
                <Txt style={styles.detailValue}>{formatSelectedDate(quote.delivery)}</Txt>
              </View>
            </View>
            <View style={styles.sectionBlock}>
              <Txt style={styles.sectionEyebrow}>MENSAGEM AO CLIENTE</Txt>
              <Txt style={styles.projectMessage}>{quote.message}</Txt>
            </View>
            {!!error && (
              <Txt accessibilityRole="alert" style={styles.error}>
                {error}
              </Txt>
            )}
            <View style={styles.modalActions}>
              <Button variant="secondary" disabled={busy} onPress={() => setConfirm(false)}>
                Voltar e editar
              </Button>
              <Button icon={ArrowUpRight} loading={busy} onPress={() => void send()}>
                {token ? 'Confirmar envio' : 'Confirmar simulação'}
              </Button>
            </View>
          </>
        )}
      </Dialog>
    </ScrollView>
  );
}
