import { useState } from 'react';
import { router, Slot, usePathname, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ChartNoAxesCombined, ChevronDown, ChevronRight, CircleHelp, Ellipsis, FolderKanban, House, Inbox, LayoutGrid, ListTodo, LogOut, Search, Settings2, UploadCloud, UserPlus, UsersRound, Wallet, X, type LucideIcon } from 'lucide-react-native';
import { Badge, Brand, Button, IconButton, Txt, common } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { colors, desktopWidth, font } from '@/constants/design';
import { roleLabel, useSession, type UserRole } from '@/features/auth/session';
import { useWorkspace } from '@/features/workspace/data';
import { useInbox } from '@/features/requests/inbox';
import { WorkspaceDialogs } from '@/features/workspace/dialogs';

export const modules: { title: string; href: string; icon: LucideIcon; description: string }[] = [
  { title: 'Visão geral', href: '/dashboard', icon: LayoutGrid, description: 'Pendências e projetos em andamento' },
  { title: 'Operação', href: '/operacao', icon: FolderKanban, description: 'Requisições, orçamentos e ordens de serviço' },
  { title: 'Entregas', href: '/entregas', icon: UploadCloud, description: 'Envio de traduções concluídas para revisão' },
  { title: 'Solicitações', href: '/solicitacoes', icon: Inbox, description: 'Pedidos do site, análise e orçamentos por e-mail' },
  { title: 'Usuários', href: '/usuarios', icon: UserPlus, description: 'Contas, perfis e acessos à plataforma' },
  { title: 'Cadastros', href: '/area/cadastros', icon: UsersRound, description: 'Clientes, profissionais e parceiros' },
  { title: 'Financeiro', href: '/area/financeiro', icon: Wallet, description: 'Vendas, compras e faturamento' },
  { title: 'Relatórios', href: '/area/relatorios', icon: ChartNoAxesCombined, description: 'Resultados e indicadores' },
  { title: 'Administração', href: '/area/administracao', icon: Settings2, description: 'Equipe, permissões e configurações' },
];

export function modulesFor(role: UserRole) {
  if (role === 'admin') return modules.filter(item => item.href !== '/entregas');
  if (role === 'employee') return modules.filter(item => !['/entregas', '/usuarios', '/area/administracao'].includes(item.href));
  if (role === 'hr') return modules.filter(item => ['/dashboard', '/area/cadastros'].includes(item.href));
  return modules.filter(item => ['/dashboard', '/operacao', '/entregas'].includes(item.href));
}

function NavItem({ title, href, icon: Icon, active, badge }: { title: string; href: string; icon: LucideIcon; active: boolean; badge?: number }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} aria-current={active ? 'page' : undefined} accessibilityState={{ selected: active }} onPress={() => router.push(href as Href)}
    style={({ hovered }) => [s.navItem, active && s.navActive, hovered && !active && { backgroundColor: colors.navigationHover }]}>
    <Icon size={18} color={active ? colors.accent : colors.navigationMuted} strokeWidth={active ? 2 : 1.7} />
    <Txt style={[s.navLabel, active && { color: colors.accent, fontWeight: '600' }]}>{title}</Txt>
    {badge !== undefined && <View style={s.count}><Txt style={s.countText}>{badge}</Txt></View>}
  </Pressable>;
}

export function WorkspaceShell() {
  const { width } = useWindowDimensions();
  const desktop = width >= desktopWidth;
  const pathname = usePathname();
  const { session, signOut } = useSession();
  const visibleModules = modulesFor(session?.role ?? 'translator');
  const staffMember = session?.role === 'employee' || session?.role === 'admin';
  const showMore = session?.role !== 'translator';
  const { search, setSearch, tasks } = useWorkspace();
  const [profile, setProfile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [read, setRead] = useState(false);
  const [help, setHelp] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const section = visibleModules.find(item => pathname === item.href)?.title ?? (pathname === '/tarefas' ? 'Minhas tarefas' : 'Meu espaço');
  const { requests } = useInbox();
  const received = requests.filter(item => item.status === 'Recebido').length;
  const pending = tasks.filter(task => !task.done).length;
  function logout() { setProfile(false); signOut(); }
  const initials = session?.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'ER';
  const profileButton = <Pressable accessibilityRole="button" accessibilityLabel="Abrir meu perfil" onPress={() => setProfile(true)} style={s.profileButton}><View style={s.avatar}><Txt style={{ fontSize: 14, color: colors.white, fontWeight: '700' }}>{initials}</Txt></View>{desktop && <><View style={{ flex: 1 }}><Txt style={s.profileName}>{session?.name}</Txt><Txt style={s.profileRole}>{session ? roleLabel[session.role] : ''}</Txt></View><ChevronDown size={14} color={colors.muted} /></>}</Pressable>;
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <View style={s.root}>
      {desktop && <View style={s.sidebar}>
        <View style={s.brand}><Brand inverse /></View>
        <ScrollView contentContainerStyle={s.navContent}>
          {visibleModules.filter(item => ['/dashboard', '/operacao', '/entregas', '/solicitacoes'].includes(item.href)).map(item => <NavItem key={item.href} {...item} active={pathname === item.href} badge={item.href === '/solicitacoes' ? received : undefined} />)}
          <NavItem title="Minhas tarefas" href="/tarefas" icon={ListTodo} active={pathname === '/tarefas'} badge={pending} />
          {visibleModules.some(item => item.href === '/usuarios' || item.href.startsWith('/area/')) && <><View style={s.separator} /><Txt style={s.navSection}>Gestão</Txt>
            {visibleModules.filter(item => item.href === '/usuarios' || item.href.startsWith('/area/')).map(item => <NavItem key={item.href} {...item} active={pathname === item.href} />)}</>}
        </ScrollView>
        <View style={s.sidebarBottom}><Pressable accessibilityRole="button" onPress={() => setHelp(true)} style={s.help}><CircleHelp size={18} color={colors.navigationMuted} /><Txt style={s.navLabel}>Central de ajuda</Txt></Pressable><View style={s.separator} />{profileButton}</View>
      </View>}
      <View style={s.main}>
        <View style={[s.header, !desktop && s.mobileHeader]}>
          {desktop ? <View style={common.row}><Txt style={s.breadcrumb}>Aliança Traduções</Txt><ChevronRight size={12} color={colors.muted} /><Txt style={s.breadcrumb}>{section}</Txt></View> : <Brand compact />}
          <View style={[s.headerActions, !desktop && { gap: 2 }]}>
            {desktop && <View style={s.search}><Search size={17} color={colors.muted} /><TextInput accessibilityLabel="Buscar projetos" placeholder="Buscar projeto ou cliente..." placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} onSubmitEditing={() => router.push('/operacao')} style={s.searchInput} />{!!search && <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => setSearch('')} style={{ padding: 5 }}><X size={14} color={colors.muted} /></Pressable>}</View>}
            {!desktop && <IconButton icon={Search} label="Buscar projetos" onPress={() => setMobileSearch(!mobileSearch)} />}
            <View><IconButton icon={Bell} label="Notificações" onPress={() => setNotifications(true)} />{!read && <View pointerEvents="none" style={s.notificationDot} />}</View>
            {!desktop && profileButton}
          </View>
        </View>
        {mobileSearch && !desktop && <View style={s.mobileSearch}><Search size={18} color={colors.muted} /><TextInput autoFocus accessibilityLabel="Buscar projetos" placeholder="Buscar projeto ou cliente..." placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={s.searchInput} onSubmitEditing={() => router.push('/operacao')} /><IconButton icon={X} label="Fechar busca" onPress={() => { setMobileSearch(false); setSearch(''); }} /></View>}
        <View style={s.content}><Slot /></View>
        {!desktop && <View style={s.bottomNav}>{[
          { title: 'Início', href: '/dashboard', icon: House }, { title: 'Operação', href: '/operacao', icon: FolderKanban },
          ...(session?.role === 'translator' ? [{ title: 'Entregas', href: '/entregas', icon: UploadCloud }] : []),
          ...(staffMember ? [{ title: 'Pedidos', href: '/solicitacoes', icon: Inbox }] : []), { title: 'Tarefas', href: '/tarefas', icon: ListTodo },
          ...(showMore ? [{ title: 'Mais', href: '/mais', icon: Ellipsis }] : []),
        ].map(item => { const active = pathname === item.href || (item.href === '/mais' && pathname.startsWith('/area/')); const Icon = item.icon;
          return <Pressable key={item.href} accessibilityRole="button" accessibilityLabel={item.title} aria-current={active ? 'page' : undefined} accessibilityState={{ selected: active }} onPress={() => router.push(item.href as Href)} style={[s.bottomItem, active && s.bottomActive]}><View style={s.bottomIcon}><Icon size={24} color={active ? colors.accent : colors.ink} strokeWidth={active ? 2.3 : 1.8} /></View><Txt style={[s.bottomLabel, active && { color: colors.accent, fontWeight: '600' }]}>{item.title}</Txt></Pressable>;
        })}</View>}
      </View>
    </View>
    <Dialog open={profile} onClose={() => setProfile(false)} title="Meu perfil">
      <View style={common.row}><View style={[s.avatar, { width: 48, height: 48 }]}><Txt style={{ color: colors.white, fontWeight: '600' }}>{initials}</Txt></View><View><Txt style={{ fontWeight: '600' }}>{session?.name}</Txt><Txt style={common.caption}>{session?.email}</Txt></View></View>
      <Badge>{session ? `${roleLabel[session.role]}${session.demo ? ' · Demonstração' : ' · Conta autenticada'}` : ''}</Badge><Txt style={common.caption}>Aliança Traduções / {session?.role === 'translator' ? 'Portal do tradutor' : session?.role === 'hr' ? 'Recursos Humanos' : 'Gestão da plataforma'}</Txt><Button variant="secondary" icon={LogOut} onPress={logout}>Sair da conta</Button>
    </Dialog>
    <Dialog open={notifications} onClose={() => setNotifications(false)} title="Notificações">
      <Badge tone="neutral">Dados demonstrativos</Badge>
      {[['Tradução pronta para revisão', 'Lucas enviou o contrato de Almeida & Associados.', 'Há 15 minutos'], ['Prazo de entrega próximo', 'O manual da Vértice Engenharia tem entrega hoje.', 'Há 40 minutos']].map(([title, text, time]) => <View key={title} style={{ gap: 5, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 16 }}><Txt style={{ fontWeight: '600', fontSize: 13 }}>{title}</Txt><Txt style={common.caption}>{text}</Txt><Txt style={{ fontSize: 10, color: colors.muted }}>{time}</Txt></View>)}
      <Button variant="secondary" onPress={() => setRead(true)} disabled={read}>{read ? 'Todas as notificações lidas' : 'Marcar todas como lidas'}</Button>
    </Dialog>
    <Dialog open={help} onClose={() => setHelp(false)} title="Central de ajuda"><Badge tone="amber">Demonstração</Badge><Txt>Aliança Traduções</Txt><Txt style={common.caption}>Manuais de acesso e documentos institucionais ainda não foram disponibilizados neste ambiente.</Txt><Button variant="secondary" onPress={() => setHelp(false)}>Voltar ao painel</Button></Dialog>
    <WorkspaceDialogs />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  root: { flex: 1, flexDirection: 'row', minHeight: 0 },
  sidebar: { width: 248, backgroundColor: colors.navigation, borderRightWidth: 1, borderRightColor: colors.line },
  brand: { paddingHorizontal: 24, paddingVertical: 36 },
  navContent: { paddingHorizontal: 16, paddingTop: 12 },
  navSection: { color: colors.navigationMuted, fontSize: 12, lineHeight: 18, fontWeight: '600', marginHorizontal: 13, marginBottom: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, minHeight: 54, borderRadius: 28, gap: 12, marginBottom: 6 },
  navActive: { backgroundColor: colors.navigationActive },
  navLabel: { fontSize: 15, lineHeight: 22, color: colors.navigationText, flex: 1 },
  count: { backgroundColor: colors.navigationLine, paddingHorizontal: 8, borderRadius: 12 },
  countText: { fontSize: 12, lineHeight: 20, color: colors.navigationText },
  separator: { height: 1, backgroundColor: colors.navigationLine, marginVertical: 24 },
  sidebarBottom: { padding: 18 },
  help: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40, paddingHorizontal: 8 },
  profileButton: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, minWidth: 44, justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#373044', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: colors.white },
  profileRole: { fontSize: 12, color: colors.navigationMuted, lineHeight: 18 },
  main: { flex: 1, minWidth: 0, minHeight: 0, backgroundColor: colors.canvas },
  header: { height: 88, backgroundColor: colors.canvas, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 5 },
  mobileHeader: { height: 78, paddingHorizontal: 20 },
  breadcrumb: { fontSize: 14, lineHeight: 20, color: colors.muted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  search: { width: 280, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 28, backgroundColor: colors.surface },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, fontFamily: font, fontSize: 16, color: colors.ink, outlineWidth: 0 },
  notificationDot: { position: 'absolute', top: 8, right: 9, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  mobileSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  content: { flex: 1, minHeight: 0 },
  bottomNav: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 40, height: 76, marginHorizontal: 16, marginBottom: 16, marginTop: 8, padding: 5, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 32 },
  bottomActive: { backgroundColor: colors.navigationActive },
  bottomIcon: { width: 44, height: 27, justifyContent: 'center', alignItems: 'center' },
  bottomLabel: { fontSize: 12, lineHeight: 18, color: colors.ink },
});
