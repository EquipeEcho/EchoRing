import { type Href, router, Slot, usePathname } from 'expo-router';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Ellipsis,
  ListTodo,
  Search,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { IconButton } from '@/components/ui/icon-button';
import { Txt } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { roleLabel } from '@/features/auth/constants';
import { useSession } from '@/features/auth/contexts/session-context';
import { useOfferNotifications } from '@/features/offers/hooks/use-offer-notifications';
import { useInbox } from '@/features/requests/contexts/inbox-context';
import { AccountDialog } from '@/features/workspace/components/account-dialog';
import { NotificationCenter } from '@/features/workspace/components/notification-center';
import { SearchResults } from '@/features/workspace/components/search-results';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { useGlobalSearch } from '@/features/workspace/hooks/use-global-search';
import { NavItem } from '@/features/workspace/layout/nav-item';
import { notificationItems } from '@/features/workspace/utils/notification-items';
import {
  mobileMoreModulesFor,
  mobilePrimaryModulesFor,
  modulesFor,
} from '@/features/workspace/navigation/modules';
import { useStyles } from '@/features/workspace/styles/workspace-shell.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { desktopWidth } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-context';

export function WorkspaceShell() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  const desktop = width >= desktopWidth;
  const pathname = usePathname();
  const { session, signOut } = useSession();
  const role = session?.role ?? 'translator';
  const visibleModules = modulesFor(role);
  const mobilePrimaryModules = mobilePrimaryModulesFor(role);
  const mobileMoreModules = mobileMoreModulesFor(role);
  const { search, setSearch, tasks } = useWorkspace();
  const [profile, setProfile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [read, setRead] = useState(false);
  const [help, setHelp] = useState(false);
  const searchInput = useRef<TextInput>(null);
  const desktopSearch = useRef<View>(null);
  const mobileSearch = useRef<View>(null);
  const [searchDismissed, setSearchDismissed] = useState(false);
  const globalSearch = useGlobalSearch(search);
  const showResults = !searchDismissed && search.trim().length >= 2;
  const typeSearch = (value: string) => { setSearch(value); setSearchDismissed(false); };
  const closeSearch = () => { setSearchDismissed(true); searchInput.current?.blur(); };
  const dismissOnEscape = (event: { nativeEvent: { key: string } }) => {
    if (event.nativeEvent.key === 'Escape') setSearchDismissed(true);
  };
  useEffect(() => {
    if (Platform.OS !== 'web' || !showResults) return;
    // Close the results when the pointer goes down outside the search field and its panel.
    const closeOutside = (event: MouseEvent) => {
      const inside = [desktopSearch.current, mobileSearch.current]
        .some(node => node instanceof Node && node.contains(event.target as Node));
      if (!inside) setSearchDismissed(true);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [showResults]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  const section =
    visibleModules.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.title ??
    (pathname === '/tarefas' ? 'Minhas tarefas' : pathname === '/mais' ? 'Mais' : pathname.startsWith('/tradutores/') ? 'Perfil do tradutor' : 'Meu espaço');
  const { received, counts: requestCounts } = useInbox();
  const needsAttention = requestCounts.attention;
  const offerNotifications = useOfferNotifications();
  const offerUnread = offerNotifications.items.filter(item => !item.readAt).length;
  const pending = tasks.filter((task) => !task.done).length;
  const notificationList = notificationItems({
    role, demo: !!session?.demo, received, attention: needsAttention, tasks, offers: offerNotifications.items,
  });
  function logout() {
    setProfile(false);
    signOut();
  }
  const initials =
    session?.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'ER';
  const profileButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir meu perfil"
      onPress={() => setProfile(true)}
      style={styles.profileButton}
    >
      <View style={[styles.avatar, !desktop && styles.mobileAvatar]}>
        <Txt style={{ fontSize: 14, color: colors.ink, fontWeight: '700' }}>{initials}</Txt>
      </View>
      {desktop && (
        <>
          <View style={{ flex: 1 }}>
            <Txt style={styles.profileName}>{session?.name}</Txt>
            <Txt style={styles.profileRole}>{session ? roleLabel[session.role] : ''}</Txt>
          </View>
          <ChevronDown size={14} color={colors.muted} />
        </>
      )}
    </Pressable>
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.root}>
        {desktop && (
          <View style={styles.sidebar}>
            <View style={styles.brand}>
              <Brand inverse />
            </View>
            <ScrollView
              contentContainerStyle={styles.navContent}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <Txt style={styles.navSection}>ESPAÇO DE TRABALHO</Txt>
              {visibleModules
                .filter((item) =>
                  ['/dashboard', '/operacao', '/entregas', '/solicitacoes', '/perfil', '/oportunidades', '/workflows'].includes(item.href),
                )
                .map((item) => (
                  <NavItem
                    key={item.href}
                    {...item}
                    active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    badge={item.href === '/solicitacoes' ? received : item.href === '/oportunidades' ? offerUnread : undefined}
                  />
                ))}
              <NavItem
                title="Minhas tarefas"
                href="/tarefas"
                icon={ListTodo}
                active={pathname === '/tarefas'}
                badge={pending}
              />
              {visibleModules.some(
                (item) => item.href === '/usuarios' || item.href.startsWith('/area/'),
              ) && (
                <>
                  <View style={styles.separator} />
                  <Txt style={styles.navSection}>Gestão</Txt>
                  {visibleModules
                    .filter((item) => item.href === '/usuarios' || item.href.startsWith('/area/'))
                    .map((item) => (
                      <NavItem key={item.href} {...item} active={pathname === item.href} />
                    ))}
                </>
              )}
            </ScrollView>
            <View style={styles.sidebarBottom}>
              {session?.demo && <View style={styles.demoLabel}><Txt style={styles.demoLabelText}>AMBIENTE DE DEMONSTRAÇÃO</Txt></View>}
              <Pressable
                accessibilityRole="button"
                onPress={() => setHelp(true)}
                style={styles.help}
              >
                <CircleHelp size={18} color={colors.navigationMuted} />
                <Txt style={styles.navLabel}>Central de ajuda</Txt>
              </Pressable>
              <View style={styles.separator} />
              {profileButton}
            </View>
          </View>
        )}
        <View style={styles.main}>
          <View style={[styles.header, !desktop && styles.mobileHeader]}>
            {desktop ? (
              <View style={[common.row, { flex: 1, minWidth: 0, marginRight: 20 }]}>
                {width >= 1200 && <Txt style={styles.breadcrumb}>Aliança Traduções</Txt>}
                <ChevronRight size={12} color={colors.muted} />
                <Txt numberOfLines={1} style={[styles.breadcrumb, { color: colors.ink, flexShrink: 1, fontWeight: '600' }]}>{section}</Txt>
              </View>
            ) : (
              <Brand wordmarkOnly compact={width < 380} />
            )}
            <View style={[styles.headerActions, !desktop && { gap: 8 }]}>
              {desktop && (
                <View ref={desktopSearch} testID="search-field" style={styles.search}>
                  <Search size={17} color={colors.muted} />
                  <TextInput
                    ref={searchInput}
                    accessibilityLabel="Buscar no portal"
                    placeholder="Buscar solicitação, projeto ou tarefa..."
                    placeholderTextColor={colors.muted}
                    value={search}
                    onChangeText={typeSearch}
                    onFocus={() => setSearchDismissed(false)}
                    onKeyPress={dismissOnEscape}
                    onSubmitEditing={() => router.push(pathname === '/tarefas' ? '/tarefas' : '/operacao')}
                    style={styles.searchInput}
                  />
                  {!search && width >= 1200 && <Txt style={styles.shortcut}>Ctrl K</Txt>}
                  {!!search && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Limpar busca"
                      onPress={() => setSearch('')}
                      style={{ padding: 5 }}
                    >
                      <X size={14} color={colors.muted} />
                    </Pressable>
                  )}
                  {showResults && (
                    <SearchResults query={search} {...globalSearch} onSelect={closeSearch} style={styles.searchResultsDesktop} />
                  )}
                </View>
              )}
              <ThemeToggle />
              <View>
                {desktop ? (
                  <IconButton
                    icon={Bell}
                    label="Notificações"
                    onPress={() => { setNotifications(true); void offerNotifications.refresh(); }}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Notificações"
                    onPress={() => { setNotifications(true); void offerNotifications.refresh(); }}
                    style={({ pressed }) => [styles.mobileAction, pressed && { opacity: 0.65 }]}
                  >
                    <Bell size={24} color={colors.ink} strokeWidth={1.8} />
                  </Pressable>
                )}
                {((!read && (session?.demo || pending > 0 || received > 0 || needsAttention > 0)) || offerUnread > 0) && <View pointerEvents="none" style={styles.notificationDot} />}
              </View>
              {!desktop && profileButton}
            </View>
          </View>
          {!desktop && (
            <View ref={mobileSearch} testID="search-field" style={styles.mobileSearch}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buscar no portal"
                onPress={() => searchInput.current?.focus()}
                style={styles.searchGlyph}
              >
                <Search size={21} color={colors.muted} />
              </Pressable>
              <TextInput
                ref={searchInput}
                accessibilityLabel="Buscar no portal"
                placeholder="Buscar solicitações, projetos..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={typeSearch}
                onFocus={() => setSearchDismissed(false)}
                onKeyPress={dismissOnEscape}
                style={styles.searchInput}
                onSubmitEditing={() => router.push(pathname === '/tarefas' ? '/tarefas' : '/operacao')}
              />
              {!!search && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                  onPress={() => setSearch('')}
                  style={styles.clearSearch}
                >
                  <X size={17} color={colors.muted} />
                </Pressable>
              )}
              {showResults && <SearchResults query={search} {...globalSearch} onSelect={closeSearch} />}
            </View>
          )}
          <View style={styles.content}>
            <Slot />
          </View>
          {!desktop && (
            <View testID="workspace-bottom-nav" style={styles.bottomNav}>
              {[
                ...mobilePrimaryModules,
                {
                  title: 'Mais',
                  href: '/mais',
                  icon: Ellipsis,
                  description: 'Outras áreas da conta',
                },
              ].map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`) ||
                  (item.href === '/mais' &&
                    mobileMoreModules.some((module) => module.href === pathname || pathname.startsWith(`${module.href}/`)));
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.href}
                    testID="workspace-bottom-tab"
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                    aria-current={active ? 'page' : undefined}
                    accessibilityState={{ selected: active }}
                    onPress={() => router.push(item.href as Href)}
                    style={[styles.bottomItem, active && styles.bottomActive]}
                  >
                    <View style={styles.bottomIcon}>
                      <Icon
                        size={24}
                        color={active ? colors.accent : colors.ink}
                        strokeWidth={active ? 2.3 : 1.8}
                      />
                    </View>
                    <Txt
                      numberOfLines={1}
                      style={[
                        styles.bottomLabel,
                        active && { color: colors.accent, fontWeight: '600' },
                      ]}
                    >
                      {item.title}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
      <AccountDialog open={profile} session={session} initials={initials} onClose={() => setProfile(false)} onSignOut={logout} />
      <NotificationCenter
        open={notifications}
        onClose={() => setNotifications(false)}
        items={notificationList}
        demo={!!session?.demo}
        error={offerNotifications.error}
        allRead={read}
        onRead={(item) => { if (item.offerId) void offerNotifications.markRead(item.offerId); }}
        onMarkAllRead={() => { setRead(true); void Promise.all(offerNotifications.items.filter(item => !item.readAt).map(item => offerNotifications.markRead(item.id))); }}
      />
      <Dialog
        open={help}
        onClose={() => setHelp(false)}
        size="compact"
        eyebrow="SUPORTE"
        title="Central de ajuda"
      >
        <Txt style={common.caption}>
          Acesse as principais ações do seu espaço de trabalho.
        </Txt>
        {[
          { title: 'Acompanhar projetos', text: 'Veja o andamento, os idiomas e o prazo de cada projeto.', href: '/operacao' },
          { title: 'Organizar minhas tarefas', text: 'Consulte pendências ou veja as atividades já concluídas.', href: '/tarefas' },
          ...(role === 'translator' ? [{ title: 'Atualizar meu perfil', text: 'Mantenha seus idiomas, experiência e disponibilidade atualizados.', href: '/perfil' }] : []),
          ...(role === 'admin' ? [{ title: 'Gerenciar acessos', text: 'Cadastre tradutores e membros da equipe na área de Usuários.', href: '/usuarios' }] : []),
        ].filter(item => role !== 'hr' || item.href !== '/operacao').map(item => <Pressable
          key={item.href}
          accessibilityRole="button"
          onPress={() => { setHelp(false); router.push(item.href as Href); }}
          style={({ hovered }) => [styles.helpCard, hovered && { backgroundColor: colors.elevated }]}
        >
          <View style={{ flex: 1, gap: 5 }}><Txt style={{ fontWeight: '600', fontSize: 14 }}>{item.title}</Txt><Txt style={common.caption}>{item.text}</Txt></View>
          <ChevronRight size={18} color={colors.accent} />
        </Pressable>)}
        <Txt style={common.caption}>Dica: use Ctrl + K (ou ⌘ + K) para acessar a busca. Use Esc para fechar uma janela.</Txt>
        <Button variant="secondary" onPress={() => setHelp(false)}>
          Voltar ao painel
        </Button>
      </Dialog>
    </SafeAreaView>
  );
}
