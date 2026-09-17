import { useState } from 'react';
import { router, Slot, usePathname, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ChartNoAxesCombined, ChevronDown, ChevronRight, CircleHelp, Ellipsis, FolderKanban, House, LayoutGrid, ListTodo, LogOut, Search, Settings2, UsersRound, Wallet, X, type LucideIcon } from 'lucide-react-native';
import { Badge, Brand, Button, IconButton, Txt, common } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { colors, desktopWidth, font } from '@/constants/design';
import { useSession } from '@/features/auth/session';
import { useWorkspace } from '@/features/workspace/data';
import { WorkspaceDialogs } from '@/features/workspace/dialogs';

export const modules: { title: string; href: string; icon: LucideIcon; description: string }[] = [
  { title: 'Visão geral', href: '/dashboard', icon: LayoutGrid, description: 'Pendências e projetos em andamento' },
  { title: 'Operação', href: '/operacao', icon: FolderKanban, description: 'Requisições, orçamentos e ordens de serviço' },
  { title: 'Cadastros', href: '/area/cadastros', icon: UsersRound, description: 'Clientes, profissionais e parceiros' },
  { title: 'Financeiro', href: '/area/financeiro', icon: Wallet, description: 'Vendas, compras e faturamento' },
  { title: 'Relatórios', href: '/area/relatorios', icon: ChartNoAxesCombined, description: 'Resultados e indicadores' },
  { title: 'Administração', href: '/area/administracao', icon: Settings2, description: 'Equipe, permissões e configurações' },
];

function NavItem({ title, href, icon: Icon, active, badge }: { title: string; href: string; icon: LucideIcon; active: boolean; badge?: number }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} aria-current={active ? 'page' : undefined} accessibilityState={{ selected: active }} onPress={() => router.push(href as Href)}
    style={({ hovered }) => [s.navItem, active && s.navActive, hovered && !active && { backgroundColor: colors.navigationHover }]}>
    <Icon size={18} color={active ? '#A4D7BD' : colors.navigationMuted} strokeWidth={active ? 2 : 1.7} />
    <Txt style={[s.navLabel, active && { color: colors.white, fontWeight: '600' }]}>{title}</Txt>
    {badge !== undefined && <View style={s.count}><Txt style={s.countText}>{badge}</Txt></View>}
  </Pressable>;
}

export function WorkspaceShell() {
  const { width } = useWindowDimensions();
  const desktop = width >= desktopWidth;
  const pathname = usePathname();
  const { session, signOut } = useSession();
  const { search, setSearch, tasks } = useWorkspace();
  const [profile, setProfile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [read, setRead] = useState(false);
  const [help, setHelp] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const section = modules.find(item => pathname === item.href)?.title ?? (pathname === '/tarefas' ? 'Minhas tarefas' : pathname === '/mais' ? 'Mais' : 'Meu espaço');
  const pending = tasks.filter(task => !task.done).length;
  function logout() { setProfile(false); signOut(); }
  const profileButton = <Pressable accessibilityRole="button" accessibilityLabel="Abrir meu perfil" onPress={() => setProfile(true)} style={s.profileButton}><View style={s.avatar}><Txt style={{ fontSize: 12, color: colors.green, fontWeight: '600' }}>AM</Txt></View>{desktop && <><View style={{ flex: 1 }}><Txt style={s.profileName}>{session?.name}</Txt><Txt style={s.profileRole}>Gestão de projetos</Txt></View><ChevronDown size={14} color={colors.muted} /></>}</Pressable>;
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <View style={s.root}>
      {desktop && <View style={s.sidebar}>
        <View style={s.brand}><Brand inverse /></View>
        <ScrollView contentContainerStyle={s.navContent}>
          {modules.slice(0, 2).map(item => <NavItem key={item.href} {...item} active={pathname === item.href} />)}
          <NavItem title="Minhas tarefas" href="/tarefas" icon={ListTodo} active={pathname === '/tarefas'} badge={pending} />
          <View style={s.separator} />
          <Txt style={s.navSection}>Gestão</Txt>
          {modules.slice(2).map(item => <NavItem key={item.href} {...item} active={pathname === item.href} />)}
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
        {mobileSearch && !desktop && <View style={s.mobileSearch}><Search size={18} color={colors.muted} /><TextInput autoFocus accessibilityLabel="Buscar projetos" placeholder="Buscar projeto ou cliente..." value={search} onChangeText={setSearch} style={s.searchInput} onSubmitEditing={() => router.push('/operacao')} /><IconButton icon={X} label="Fechar busca" onPress={() => { setMobileSearch(false); setSearch(''); }} /></View>}
        <View style={s.content}><Slot /></View>
        {!desktop && <View style={s.bottomNav}>{[
          { title: 'Início', href: '/dashboard', icon: House }, { title: 'Operação', href: '/operacao', icon: FolderKanban },
          { title: 'Tarefas', href: '/tarefas', icon: ListTodo }, { title: 'Mais', href: '/mais', icon: Ellipsis },
        ].map(item => { const active = pathname === item.href || (item.href === '/mais' && pathname.startsWith('/area/')); const Icon = item.icon;
          return <Pressable key={item.href} accessibilityRole="button" accessibilityLabel={item.title} aria-current={active ? 'page' : undefined} accessibilityState={{ selected: active }} onPress={() => router.push(item.href as Href)} style={[s.bottomItem, active && { borderTopColor: colors.green }]}><View style={s.bottomIcon}><Icon size={21} color={active ? colors.green : colors.muted} strokeWidth={active ? 2 : 1.6} /></View><Txt style={[s.bottomLabel, active && { color: colors.green, fontWeight: '600' }]}>{item.title}</Txt></Pressable>;
        })}</View>}
      </View>
    </View>
    <Dialog open={profile} onClose={() => setProfile(false)} title="Meu perfil">
      <View style={common.row}><View style={[s.avatar, { width: 48, height: 48 }]}><Txt style={{ color: colors.green, fontWeight: '600' }}>AM</Txt></View><View><Txt style={{ fontWeight: '600' }}>{session?.name}</Txt><Txt style={common.caption}>{session?.email}</Txt></View></View>
      <Badge>Funcionário · Demonstração</Badge><Txt style={common.caption}>Aliança Traduções / Gestão de projetos</Txt><Button variant="secondary" icon={LogOut} onPress={logout}>Sair da conta</Button>
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
  safe: { flex: 1, backgroundColor: colors.white },
  root: { flex: 1, flexDirection: 'row', minHeight: 0 },
  sidebar: { width: 232, backgroundColor: colors.navigation },
  brand: { paddingHorizontal: 24, paddingVertical: 28 },
  navContent: { paddingHorizontal: 14, paddingTop: 18 },
  navSection: { color: colors.navigationMuted, fontSize: 12, lineHeight: 18, fontWeight: '600', marginHorizontal: 13, marginBottom: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 46, borderRadius: 4, gap: 12, marginBottom: 4, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  navActive: { backgroundColor: colors.navigationActive, borderLeftColor: '#A4D7BD' },
  navLabel: { fontSize: 15, lineHeight: 22, color: colors.navigationText, flex: 1 },
  count: { backgroundColor: colors.navigationLine, paddingHorizontal: 7, borderRadius: 4 },
  countText: { fontSize: 12, lineHeight: 20, color: colors.navigationText },
  separator: { height: 1, backgroundColor: colors.navigationLine, marginVertical: 24 },
  sidebarBottom: { padding: 18 },
  help: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40, paddingHorizontal: 8 },
  profileButton: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, minWidth: 44, justifyContent: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E5EEE5', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: colors.white },
  profileRole: { fontSize: 12, color: colors.navigationMuted, lineHeight: 18 },
  main: { flex: 1, minWidth: 0, minHeight: 0, backgroundColor: colors.white },
  header: { height: 72, backgroundColor: colors.white, paddingHorizontal: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line, zIndex: 5 },
  mobileHeader: { height: 64, paddingHorizontal: 14 },
  breadcrumb: { fontSize: 14, lineHeight: 20, color: colors.muted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  search: { width: 270, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 6, backgroundColor: colors.canvas },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, fontFamily: font, fontSize: 16, color: colors.ink, outlineWidth: 0 },
  notificationDot: { position: 'absolute', top: 8, right: 9, width: 6, height: 6, borderRadius: 3, backgroundColor: '#CA8554', borderWidth: 1, borderColor: colors.white },
  mobileSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  content: { flex: 1, minHeight: 0 },
  bottomNav: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, height: 64 },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderTopWidth: 2, borderTopColor: 'transparent' },
  bottomIcon: { width: 44, height: 27, justifyContent: 'center', alignItems: 'center' },
  bottomLabel: { fontSize: 12, lineHeight: 18, color: colors.muted },
});
