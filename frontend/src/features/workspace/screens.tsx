import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ArrowDownToLine, ArrowRight, CalendarDays, Check, CheckCheck, ChevronRight, CircleCheck, ClipboardList, Clock3, FileCheck2, FileText, FolderKanban, Inbox, ListTodo, Plus, SearchX, Settings2, type LucideIcon } from 'lucide-react-native';
import { Badge, Button, EmptyState, PageHeading, Txt, common } from '@/components/ui/primitives';
import { colors } from '@/constants/design';
import { useSession } from '@/features/auth/session';
import { matchesSearch, statusTone, useWorkspace, type Project, type Task } from './data';
import { modules } from '@/components/layout/workspace-shell';

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
    {wide && <View style={s.tableHead}><Txt style={[s.columnLabel, { flex: 1 }]}>PROJETO / CLIENTE</Txt><Txt style={[s.columnLabel, s.statusColumn]}>STATUS</Txt><Txt style={[s.columnLabel, s.deadlineColumn]}>PRAZO</Txt><View style={{ width: 16 }} /></View>}
    {projects.map((project, index) => <Pressable key={project.id} accessibilityRole="button" accessibilityLabel={`Abrir ${project.id}: ${project.title}`} onPress={() => setSelected(project)}
      style={({ hovered }) => [s.projectRow, !wide && s.projectMobile, hovered && { backgroundColor: '#F0F5F0' }]}>
      <View style={s.projectMain}><View style={[s.clientAvatar, { backgroundColor: ['#EAF0E9', '#EEF0F7', '#F6EFE5', '#F0EBF3'][index % 4] }]}><Txt style={s.clientInitials}>{project.initials}</Txt></View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Txt numberOfLines={1} style={s.projectTitle}>{project.title}</Txt><Txt numberOfLines={1} style={s.projectMeta}>{project.id} · {project.client}</Txt>
          {!wide && <Txt style={s.languages}>{project.languages}</Txt>}
        </View>
      </View>
      <View style={[s.rowStatus, !wide && s.mobileStatus]}><View style={wide ? s.statusColumn : undefined}><Badge tone={statusTone[project.status]}>{project.status}</Badge></View>
        <View style={[wide && s.deadlineColumn, common.row, { gap: 5 }]}>{project.urgent && <Clock3 size={12} color={colors.amber} />}<Txt style={[s.deadline, project.urgent && { color: colors.amber }]}>{project.deadline}</Txt></View>
        {wide && <ChevronRight size={16} color="#A0AAA2" />}
      </View>
    </Pressable>)}
  </View>;
}

function TaskRow({ task }: { task: Task }) {
  const { toggleTask } = useWorkspace();
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={task.title} aria-checked={task.done} accessibilityState={{ checked: task.done }} onPress={() => toggleTask(task.id)} style={({ hovered }) => [s.task, hovered && { backgroundColor: '#EFF4EF' }]}>
    <View style={[s.checkbox, task.done && s.checked]}>{task.done && <Check size={12} color={colors.white} strokeWidth={3} />}</View>
    <View style={{ flex: 1, gap: 4 }}><Txt style={[s.taskTitle, task.done && { textDecorationLine: 'line-through', color: colors.muted }]}>{task.title}</Txt><Txt style={s.taskMeta}>{task.project} · {task.done ? 'Concluída' : task.due}</Txt></View>
  </Pressable>;
}

function Metric({ title, value, detail, icon: Icon, tone }: { title: string; value: number; detail: string; icon: LucideIcon; tone: 'green' | 'blue' | 'amber' | 'neutral' }) {
  const { width } = useWindowDimensions();
  const color = tone === 'blue' ? colors.blue : tone === 'amber' ? colors.amber : colors.green;
  const background = tone === 'blue' ? colors.blueSoft : tone === 'amber' ? colors.amberSoft : colors.greenSoft;
  return <View style={[s.metric, width < 760 && { flexBasis: '46%', flexGrow: 1 }]}>
    <View style={s.metricTop}><Txt style={s.metricLabel}>{title}</Txt><View style={[s.metricIcon, { backgroundColor: background }]}><Icon size={17} color={color} strokeWidth={1.7} /></View></View>
    <Txt style={s.metricValue}>{String(value).padStart(2, '0')}</Txt><Txt style={s.metricDetail}>{detail}</Txt>
  </View>;
}

export function DashboardScreen() {
  const { projects, tasks, search, setNewRequest } = useWorkspace();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'active' | 'all'>('active');
  const active = projects.filter(p => p.status !== 'Concluído');
  const visible = (tab === 'active' ? active : projects).filter(p => matchesSearch(p, search));
  const date = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  return <Page>
    <View style={s.eyebrowRow}><Txt style={s.eyebrow}>SEU ESPAÇO DE TRABALHO</Txt><Badge tone="neutral">Demonstração</Badge></View>
    <PageHeading title="Visão geral" subtitle={`Olá, ${session?.name.split(' ')[0]}. Vamos acompanhar o que precisa da sua atenção.`} action={<View style={common.row}><CalendarDays size={16} color={colors.muted} /><Txt style={s.date}>{date}</Txt></View>} />
    <View style={s.metrics}>
      <Metric title="Em andamento" value={projects.filter(p => ['Em tradução', 'Em revisão'].includes(p.status)).length} detail="Projetos em execução" icon={FolderKanban} tone="blue" />
      <Metric title="Aguardando aprovação" value={projects.filter(p => p.status === 'Aguardando aprovação').length} detail="Orçamentos enviados" icon={Clock3} tone="amber" />
      <Metric title="Em revisão" value={projects.filter(p => p.status === 'Em revisão').length} detail="Prontos para conferir" icon={FileCheck2} tone="green" />
      <Metric title="Concluídos" value={projects.filter(p => p.status === 'Concluído').length} detail="Traduções entregues" icon={CircleCheck} tone="neutral" />
    </View>
    <View style={[s.workGrid, width < 1280 && { flexDirection: 'column' }]}>
      <View style={s.projectsSection}>
        <View style={s.sectionHeader}><View><Txt style={common.sectionTitle}>Projetos e solicitações</Txt><Txt style={s.sectionCaption}>Acompanhe as próximas entregas.</Txt></View><Button icon={Plus} onPress={() => setNewRequest(true)} style={width < 500 ? { paddingHorizontal: 10 } : undefined}>Nova requisição</Button></View>
        <View style={s.tabs}><Tab label={`Em aberto (${active.length})`} active={tab === 'active'} onPress={() => setTab('active')} /><Tab label={`Todos (${projects.length})`} active={tab === 'all'} onPress={() => setTab('all')} /></View>
        <ProjectList projects={visible.slice(0, 5)} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/operacao')} style={s.viewAll}><Txt style={s.viewAllText}>Ver toda a operação</Txt><ArrowRight size={15} color={colors.green} /></Pressable>
      </View>
      <View style={[s.tasksSection, width < 1280 && { width: '100%', borderLeftWidth: 0, paddingLeft: 0, borderTopWidth: 1, paddingTop: 26 }]}>
        <View style={s.sectionHeader}><Txt style={common.sectionTitle}>Minhas tarefas</Txt><View style={s.taskCount}><Txt style={s.taskCountText}>{tasks.filter(t => !t.done).length}</Txt></View></View>
        <Txt style={s.sectionCaption}>Um passo de cada vez.</Txt>
        <View style={{ marginTop: 15 }}>{tasks.slice(0, 4).map(task => <TaskRow key={task.id} task={task} />)}</View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/tarefas')} style={s.viewAll}><Txt style={s.viewAllText}>Ver minhas tarefas</Txt><ArrowRight size={15} color={colors.green} /></Pressable>
      </View>
    </View>
    <View style={s.activitySection}><View style={s.sectionHeader}><Txt style={common.sectionTitle}>Atividade recente</Txt><Txt style={common.caption}>Hoje</Txt></View>
      <View style={[s.activities, width < 900 && { flexDirection: 'column' }]}>
        {[{ icon: FileCheck2, name: 'Tradução enviada para revisão', detail: 'Lucas Ferreira · OS-2026-083', time: 'Há 15 minutos', color: colors.green },
          { icon: FileText, name: 'Orçamento enviado ao cliente', detail: 'Ana Martins · OR-2026-042', time: 'Há 1 hora', color: colors.amber },
          { icon: CheckCheck, name: 'Entrega concluída', detail: 'Pedro Silva · OS-2026-080', time: 'Há 2 horas', color: colors.blue }].map(item => <View key={item.name} style={s.activity}><View style={s.activityIcon}><item.icon size={18} color={item.color} strokeWidth={1.6} /></View><View style={{ flex: 1, gap: 3 }}><Txt style={s.activityTitle}>{item.name}</Txt><Txt style={s.activityDetail}>{item.detail}</Txt><Txt style={s.activityTime}>{item.time}</Txt></View></View>)}
      </View>
    </View>
    <View style={s.pageFooter}><Txt style={s.footerText}>Aliança Traduções</Txt><Txt style={s.footerText}>Echo Ring · Ambiente demonstrativo</Txt></View>
  </Page>;
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" aria-selected={active} accessibilityState={{ selected: active }} onPress={onPress} style={[s.tab, active && s.tabActive]}><Txt style={[s.tabText, active && { color: colors.green, fontWeight: '600' }]}>{label}</Txt></Pressable>;
}

export function OperationsScreen() {
  const { projects, search, setNewRequest } = useWorkspace();
  const [status, setStatus] = useState('Todos');
  const filtered = projects.filter(project => (status === 'Todos' || project.status === status) && matchesSearch(project, search));
  return <Page>
    <PageHeading title="Operação" subtitle="Requisições, orçamentos e ordens de serviço." action={<Button icon={Plus} onPress={() => setNewRequest(true)}>Nova requisição</Button>} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
      {['Todos', 'Nova requisição', 'Aguardando aprovação', 'Em tradução', 'Em revisão', 'Concluído'].map(value => <Tab key={value} label={value} active={status === value} onPress={() => setStatus(value)} />)}
    </ScrollView>
    <View style={s.listCaption}><Txt style={common.caption}>{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</Txt><Badge tone="neutral">Demonstração</Badge></View>
    <ProjectList projects={filtered} />
  </Page>;
}

export function TasksScreen() {
  const { tasks } = useWorkspace();
  const [filter, setFilter] = useState('Pendentes');
  const visible = tasks.filter(task => filter === 'Todas' || (filter === 'Concluídas' ? task.done : !task.done));
  return <Page><PageHeading title="Minhas tarefas" subtitle="Seus próximos passos, organizados em um só lugar." action={<Badge tone="neutral">Demonstração</Badge>} />
    <View style={s.tabs}>{['Pendentes', 'Concluídas', 'Todas'].map(value => <Tab key={value} label={value} active={filter === value} onPress={() => setFilter(value)} />)}</View>
    <View style={{ maxWidth: 800 }}>{visible.map(task => <TaskRow key={task.id} task={task} />)}{!visible.length && <EmptyState icon={CheckCheck} title="Tudo em dia por aqui" text="Nenhuma tarefa nesta lista." />}</View>
  </Page>;
}

export function MoreScreen() {
  return <Page><PageHeading title="Mais" subtitle="Todas as áreas do seu espaço de trabalho." />
    {modules.filter(item => !['/dashboard', '/operacao'].includes(item.href)).map(item => <Pressable key={item.href} accessibilityRole="button" onPress={() => router.push(item.href as Href)} style={s.moduleRow}><View style={s.moduleIcon}><item.icon size={22} color={colors.green} /></View><View style={{ flex: 1, gap: 4 }}><Txt style={{ fontWeight: '600' }}>{item.title}</Txt><Txt style={common.caption}>{item.description}</Txt></View><ChevronRight size={18} color={colors.muted} /></Pressable>)}
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
  page: { padding: 34, paddingTop: 30, flexGrow: 1 },
  pageInner: { width: '100%', maxWidth: 1480, alignSelf: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  eyebrow: { fontSize: 9, color: colors.muted, fontWeight: '600' },
  date: { fontSize: 12, color: colors.muted },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 38 },
  metric: { flex: 1, minWidth: 130, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 7, padding: 18 },
  metricTop: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  metricLabel: { fontSize: 11, color: colors.muted, flex: 1, lineHeight: 17 },
  metricIcon: { width: 30, height: 30, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  metricValue: { fontSize: 32, lineHeight: 42, fontWeight: '600', marginTop: 8, marginBottom: 3 },
  metricDetail: { fontSize: 10, color: colors.muted, lineHeight: 16 },
  workGrid: { flexDirection: 'row', gap: 28 },
  projectsSection: { flex: 1, minWidth: 0 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  sectionCaption: { color: colors.muted, fontSize: 11, marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: colors.line, marginTop: 18 },
  tab: { paddingTop: 10, paddingBottom: 13, borderBottomWidth: 2, borderBottomColor: 'transparent', minHeight: 44 },
  tabActive: { borderBottomColor: colors.green },
  tabText: { color: colors.muted, fontSize: 11 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, height: 38, borderBottomWidth: 1, borderBottomColor: colors.line },
  columnLabel: { fontSize: 9, color: '#849087', fontWeight: '500' },
  statusColumn: { width: 153 },
  deadlineColumn: { width: 63 },
  projectRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 15, paddingHorizontal: 10 },
  projectMobile: { flexDirection: 'column', alignItems: 'stretch', paddingHorizontal: 0, gap: 14 },
  projectMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, minWidth: 0 },
  clientAvatar: { width: 34, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  clientInitials: { fontSize: 10, fontWeight: '600', color: '#6B776F' },
  projectTitle: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  projectMeta: { fontSize: 10, color: colors.muted, lineHeight: 17 },
  languages: { fontSize: 10, color: colors.muted },
  rowStatus: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mobileStatus: { paddingLeft: 45, justifyContent: 'space-between', flexWrap: 'wrap' },
  deadline: { fontSize: 11, color: colors.muted },
  viewAll: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-start' },
  viewAllText: { fontSize: 11, color: colors.green, fontWeight: '600' },
  tasksSection: { width: 280, borderLeftWidth: 1, borderColor: colors.line, paddingLeft: 26 },
  taskCount: { backgroundColor: '#E8EEE8', paddingHorizontal: 7, borderRadius: 4 },
  taskCountText: { fontSize: 10, color: colors.green },
  task: { flexDirection: 'row', gap: 11, paddingVertical: 17, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'flex-start', minHeight: 72 },
  checkbox: { marginTop: 3, width: 17, height: 17, borderWidth: 1, borderColor: '#CBD4CD', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  checked: { backgroundColor: colors.green, borderColor: colors.green },
  taskTitle: { fontSize: 12, lineHeight: 19 },
  taskMeta: { fontSize: 10, color: colors.muted, lineHeight: 17 },
  activitySection: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 25, marginTop: 22 },
  activities: { flexDirection: 'row', gap: 22, marginTop: 22 },
  activity: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  activityIcon: { width: 34, height: 34, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 11, fontWeight: '500', lineHeight: 18 },
  activityDetail: { fontSize: 10, color: colors.muted, lineHeight: 16 },
  activityTime: { fontSize: 9, color: '#8C968F', lineHeight: 16 },
  pageFooter: { marginTop: 35, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  footerText: { fontSize: 9, color: '#8C968F' },
  listCaption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 22 },
  moduleIcon: { backgroundColor: colors.greenSoft, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  areaItem: { minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
});
