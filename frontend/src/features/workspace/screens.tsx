import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ArrowRight, Check, CheckCheck, ChevronRight, Clock3, FileText, FolderKanban, Inbox, Plus, SearchX, type LucideIcon } from 'lucide-react-native';
import { Badge, Button, EmptyState, PageHeading, Txt, common } from '@/components/ui/primitives';
import { useInbox } from '@/features/requests/inbox';
import { colors } from '@/constants/design';
import { matchesSearch, statusTone, useWorkspace, type Project, type Task } from './data';
import { modules, modulesFor } from '@/components/layout/workspace-shell';
import { useSession } from '@/features/auth/session';

function Page({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.page, width < 700 && { padding: 20, paddingTop: 26 }]}><View style={s.pageInner}>{children}</View></ScrollView>;
}

function ProjectList({ projects }: { projects: Project[] }) {
  const { width } = useWindowDimensions();
  const { setSelected, setSearch, search } = useWorkspace();
  const wide = width >= 800;
  if (!projects.length) return <EmptyState icon={SearchX} title="Nenhum projeto encontrado" text={search ? 'Tente outro nome de cliente, título ou código.' : 'Não há registros com o status selecionado.'} action={search ? <Button variant="secondary" onPress={() => setSearch('')}>Limpar busca</Button> : undefined} />;
  return <View>
    {wide && <View style={s.tableHead}><Txt style={[s.columnLabel, { flex: 1 }]}>Projeto / Cliente</Txt><Txt style={[s.columnLabel, s.statusColumn]}>Status</Txt><Txt style={[s.columnLabel, s.deadlineColumn]}>Prazo</Txt><View style={{ width: 16 }} /></View>}
    {projects.map(project => <Pressable key={project.id} accessibilityRole="button" accessibilityLabel={`Abrir ${project.id}: ${project.title}`} onPress={() => setSelected(project)}
      style={({ hovered }) => [s.projectRow, !wide && s.projectMobile, hovered && { backgroundColor: colors.surface }]}>
      <View style={s.projectMain}>
        <View style={s.projectIcon}><FileText size={24} color={colors.accent} strokeWidth={1.6} /></View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Txt numberOfLines={wide ? 1 : undefined} style={s.projectTitle}>{project.title}</Txt><Txt style={s.projectMeta}>{project.client} · {project.id}</Txt>
          {!wide && <Txt style={s.languages}>{project.languages}</Txt>}
        </View>
      </View>
      <View style={[s.rowStatus, !wide && s.mobileStatus]}><View style={wide ? s.statusColumn : undefined}><Badge tone={statusTone[project.status]}>{project.status}</Badge></View>
        <View style={[wide && s.deadlineColumn, common.row, { gap: 5 }]}>{project.urgent && <Clock3 size={12} color={colors.amber} />}<Txt style={[s.deadline, project.urgent && { color: colors.amber }]}>{project.deadline}</Txt></View>
        {wide && <ChevronRight size={16} color={colors.muted} />}
      </View>
    </Pressable>)}
  </View>;
}

function TaskRow({ task }: { task: Task }) {
  const { toggleTask } = useWorkspace();
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={task.title} aria-checked={task.done} accessibilityState={{ checked: task.done }} onPress={() => toggleTask(task.id)} style={({ hovered }) => [s.task, hovered && { backgroundColor: colors.surface }]}>
    <View style={[s.checkbox, task.done && s.checked]}>{task.done && <Check size={14} color={colors.white} strokeWidth={3} />}</View>
    <View style={{ flex: 1, gap: 4 }}><Txt style={[s.taskTitle, task.done && { textDecorationLine: 'line-through', color: colors.muted }]}>{task.title}</Txt><Txt style={s.taskMeta}>{task.project} · {task.done ? 'Concluída' : task.due}</Txt></View>
  </Pressable>;
}

function Metric({ title, value, color, icon: Icon }: { title: string; value: number; color: string; icon: LucideIcon }) {
  return <View style={s.metric}>
    <View style={s.metricIcon}><Icon size={21} color={colors.accent} strokeWidth={1.8} /></View>
    <Txt style={[s.metricValue, { color }]}>{value}</Txt><Txt style={s.metricLabel}>{title}</Txt>
  </View>;
}

export function DashboardScreen() {
  const { projects, tasks, search, setNewRequest } = useWorkspace();
  const { session } = useSession();
  const employee = session?.role === 'employee' || session?.role === 'admin';
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'active' | 'all'>('active');
  const { requests } = useInbox();
  const received = requests.filter(item => item.status === 'Recebido').length;
  const active = projects.filter(p => p.status !== 'Concluído');
  const visible = (tab === 'active' ? active : projects).filter(p => matchesSearch(p, search));
  const date = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  return <Page>
    <PageHeading title="Visão geral" subtitle={`${employee ? 'Projetos da equipe' : 'Meus projetos'} · ${date}`} action={employee ? <Button icon={Plus} onPress={() => setNewRequest(true)}>Nova requisição</Button> : undefined} />
    <View style={s.metrics}>
      <Metric icon={FolderKanban} title="Em andamento" value={projects.filter(p => ['Em tradução', 'Em revisão'].includes(p.status)).length} color={colors.ink} />
      <Metric icon={Clock3} title="Aguardando aprovação" value={projects.filter(p => p.status === 'Aguardando aprovação').length} color={colors.amber} />
      <Metric icon={CheckCheck} title="Entrega hoje" value={active.filter(p => p.deadline === 'Hoje').length} color={colors.blue} />
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Acompanhar projetos em andamento" onPress={() => router.push('/operacao')} style={({ hovered }) => [s.activity, hovered && { backgroundColor: colors.elevated }]}>
      <View style={s.activityIcon}><FolderKanban size={24} color={colors.accent} /></View>
      <View style={{ flex: 1, gap: 3 }}><Txt style={s.activityTitle}>Tudo no seu ritmo.</Txt><Txt style={common.caption}>{active.length} projetos em aberto para acompanhar.</Txt></View>
      <View style={s.activityArrow}><ArrowRight size={21} color={colors.ink} /></View>
    </Pressable>
    {employee && received > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Ver solicitações do site" onPress={() => router.push('/solicitacoes')} style={s.activity}>
      <View style={s.activityIcon}><Inbox size={24} color={colors.accent} /></View><View style={{ flex: 1, gap: 3 }}><Txt style={s.activityTitle}>{received} {received === 1 ? 'nova solicitação' : 'novas solicitações'} do site</Txt><Txt style={common.caption}>Analise os documentos e prepare a proposta para o cliente.</Txt></View><ArrowRight size={21} color={colors.accent} />
    </Pressable>}
    <View style={[s.workGrid, width < 1280 && { flexDirection: 'column' }]}>
      <View style={s.projectsSection}>
        <View style={s.sectionHeader}><Txt style={common.sectionTitle}>Projetos</Txt><Txt style={common.caption}>{active.length} em aberto</Txt></View>
        <View style={s.tabs}><Tab label={`Em aberto (${active.length})`} active={tab === 'active'} onPress={() => setTab('active')} /><Tab label={`Todos (${projects.length})`} active={tab === 'all'} onPress={() => setTab('all')} /></View>
        <ProjectList projects={visible.slice(0, 5)} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/operacao')} style={s.viewAll}><Txt style={s.viewAllText}>Ver toda a operação</Txt><ArrowRight size={15} color={colors.accent} /></Pressable>
      </View>
      <View style={[s.tasksSection, width < 1280 && { width: '100%' }]}>
        <View style={s.sectionHeader}><Txt style={common.sectionTitle}>Minhas tarefas</Txt><Txt style={common.caption}>{tasks.filter(t => !t.done).length} pendentes</Txt></View>
        <View style={{ marginTop: 15 }}>{tasks.slice(0, 4).map(task => <TaskRow key={task.id} task={task} />)}</View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/tarefas')} style={s.viewAll}><Txt style={s.viewAllText}>Ver minhas tarefas</Txt><ArrowRight size={15} color={colors.accent} /></Pressable>
      </View>
    </View>
  </Page>;
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" aria-selected={active} accessibilityState={{ selected: active }} onPress={onPress} style={[s.tab, active && s.tabActive]}><Txt style={[s.tabText, active && { color: colors.accent, fontWeight: '600' }]}>{label}</Txt></Pressable>;
}

export function OperationsScreen() {
  const { projects, search, setNewRequest } = useWorkspace();
  const { session } = useSession();
  const employee = session?.role === 'employee' || session?.role === 'admin';
  const [status, setStatus] = useState('Todos');
  const filtered = projects.filter(project => (status === 'Todos' || project.status === status) && matchesSearch(project, search));
  return <Page>
    <PageHeading title={employee ? 'Operação' : 'Meus projetos'} subtitle={employee ? 'Requisições, orçamentos e ordens de serviço.' : 'Projetos de tradução atribuídos à sua conta.'} action={employee ? <Button icon={Plus} onPress={() => setNewRequest(true)}>Nova requisição</Button> : undefined} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
      {(employee ? ['Todos', 'Nova requisição', 'Aguardando aprovação', 'Em tradução', 'Em revisão', 'Concluído'] : ['Todos', 'Em tradução', 'Em revisão', 'Concluído']).map(value => <Tab key={value} label={value} active={status === value} onPress={() => setStatus(value)} />)}
    </ScrollView>
    <View style={s.listCaption}><Txt style={common.caption}>{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</Txt><Badge tone="neutral">Demonstração</Badge></View>
    <ProjectList projects={filtered} />
  </Page>;
}

export function TasksScreen() {
  const { tasks } = useWorkspace();
  const [filter, setFilter] = useState('Pendentes');
  const visible = tasks.filter(task => filter === 'Todas' || (filter === 'Concluídas' ? task.done : !task.done));
  return <Page><PageHeading title="Minhas tarefas" subtitle={`${tasks.filter(task => !task.done).length} tarefas pendentes`} />
    <View style={s.tabs}>{['Pendentes', 'Concluídas', 'Todas'].map(value => <Tab key={value} label={value} active={filter === value} onPress={() => setFilter(value)} />)}</View>
    <View style={{ maxWidth: 800 }}>{visible.map(task => <TaskRow key={task.id} task={task} />)}{!visible.length && <EmptyState icon={CheckCheck} title="Tudo em dia por aqui" text="Nenhuma tarefa nesta lista." />}</View>
  </Page>;
}

export function MoreScreen() {
  const { session } = useSession();
  return <Page><PageHeading title="Mais" subtitle="Áreas da Aliança Traduções" />
    {modulesFor(session?.role ?? 'translator').filter(item => !['/dashboard', '/operacao', '/entregas', '/solicitacoes'].includes(item.href)).map(item => <Pressable key={item.href} accessibilityRole="button" onPress={() => router.push(item.href as Href)} style={s.moduleRow}><View style={s.moduleIcon}><item.icon size={22} color={colors.accent} /></View><View style={{ flex: 1, gap: 4 }}><Txt style={{ fontWeight: '600' }}>{item.title}</Txt><Txt style={common.caption}>{item.description}</Txt></View><ChevronRight size={18} color={colors.muted} /></Pressable>)}
  </Page>;
}

const areaItems: Record<string, string[]> = {
  cadastros: ['Clientes', 'Profissionais e parceiros'],
  financeiro: ['Faturas de venda', 'Faturas de compra', 'Vendas pendentes de fatura'],
  relatorios: ['Requisições e orçamentos', 'Ordens de serviço', 'Receitas, despesas e lucro', 'Novos clientes', 'Log de alterações'],
  administracao: ['Usuários e permissões', 'Detalhes da empresa', 'Idiomas, países e serviços', 'Tabelas de preços', 'Modelos de workflow', 'Modelos de documentos', 'Configurações de e-mail'],
};
export function AreaScreen() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const area = modules.find(item => item.href === '/area/' + module);
  if (!area) return <Page><EmptyState icon={Inbox} title="Área não encontrada" text="Esta área não está disponível." action={<Button onPress={() => router.replace('/dashboard')}>Voltar ao início</Button>} /></Page>;
  return <Page><PageHeading title={area.title} subtitle={area.description} action={<Badge tone="neutral">Em preparação</Badge>} />
    <EmptyState icon={area.icon} title={`${area.title} em preparação`} text="Os registros desta área estarão disponíveis em uma próxima entrega." />
    <Txt style={[common.caption, { marginBottom: 10 }]}>SEÇÕES</Txt>
    {(areaItems[module] ?? []).map(title => <View key={title} style={s.areaItem}><Txt style={{ fontSize: 13 }}>{title}</Txt><Txt style={{ color: colors.muted, fontSize: 11 }}>Em breve</Txt></View>)}
  </Page>;
}

const s = StyleSheet.create({
  page: { padding: 40, paddingTop: 28, paddingBottom: 40, flexGrow: 1 },
  pageInner: { width: '100%', maxWidth: 1400, alignSelf: 'center' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  metric: { flex: 1, minWidth: 140, gap: 7, padding: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20 },
  metricIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  metricLabel: { fontSize: 13, color: colors.muted, lineHeight: 18, fontWeight: '500' },
  metricValue: { fontSize: 34, lineHeight: 39, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 18, marginBottom: 20 },
  activityIcon: { height: 46, width: 46, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 20, lineHeight: 27, fontWeight: '600' },
  activityArrow: { height: 42, width: 42, borderRadius: 14, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  workGrid: { flexDirection: 'row', gap: 18 },
  projectsSection: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 22 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  tabs: { flexDirection: 'row', gap: 6, marginTop: 18, paddingBottom: 18 },
  tab: { paddingVertical: 11, paddingHorizontal: 17, backgroundColor: colors.surface, borderRadius: 24, minHeight: 44 },
  tabActive: { backgroundColor: colors.navigationActive },
  tabText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 44, borderBottomWidth: 1, borderBottomColor: colors.line },
  columnLabel: { fontSize: 13, lineHeight: 18, color: colors.muted, fontWeight: '600' },
  statusColumn: { width: 164 },
  deadlineColumn: { width: 68 },
  projectRow: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 22, paddingHorizontal: 12 },
  projectMobile: { flexDirection: 'column', alignItems: 'stretch', paddingHorizontal: 0, gap: 12 },
  projectMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, minWidth: 0 },
  projectIcon: { width: 36, alignItems: 'center', justifyContent: 'center' },
  projectTitle: { fontSize: 18, fontWeight: '500', lineHeight: 25 },
  projectMeta: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  languages: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  rowStatus: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mobileStatus: { justifyContent: 'space-between', flexWrap: 'wrap' },
  deadline: { fontSize: 13, lineHeight: 19, fontWeight: '500', color: colors.muted },
  viewAll: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-start' },
  viewAllText: { fontSize: 14, lineHeight: 20, color: colors.accent, fontWeight: '600' },
  tasksSection: { width: 330, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 22 },
  task: { flexDirection: 'row', gap: 11, paddingVertical: 17, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'flex-start', minHeight: 72 },
  checkbox: { marginTop: 2, width: 23, height: 23, borderWidth: 1, borderColor: colors.muted, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent },
  taskTitle: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  taskMeta: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  listCaption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 22 },
  moduleIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  areaItem: { minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
});
