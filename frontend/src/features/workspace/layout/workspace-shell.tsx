import { type Href, router, Slot, usePathname } from 'expo-router';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Ellipsis,
  ListTodo,
  LogOut,
  Search,
  X,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { IconButton } from '@/components/ui/icon-button';
import { Txt } from '@/components/ui/text';
import { roleLabel } from '@/features/auth/constants';
import { useSession } from '@/features/auth/contexts/session-context';
import { useInbox } from '@/features/requests/contexts/inbox-context';
import { WorkspaceDialogs } from '@/features/workspace/components/workspace-dialogs';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { NavItem } from '@/features/workspace/layout/nav-item';
import {
  mobileMoreModulesFor,
  mobilePrimaryModulesFor,
  modulesFor,
} from '@/features/workspace/navigation/modules';
import { styles } from '@/features/workspace/styles/workspace-shell.styles';
import { common } from '@/theme/common.styles';
import { colors, desktopWidth } from '@/theme/tokens';

export function WorkspaceShell() {
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
  const section =
    visibleModules.find((item) => pathname === item.href)?.title ??
    (pathname === '/tarefas' ? 'Minhas tarefas' : pathname === '/mais' ? 'Mais' : 'Meu espaço');
  const { requests } = useInbox();
  const received = requests.filter((item) => item.status === 'Recebido').length;
  const pending = tasks.filter((task) => !task.done).length;
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
        <Txt style={{ fontSize: 14, color: colors.white, fontWeight: '700' }}>{initials}</Txt>
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
              {visibleModules
                .filter((item) =>
                  ['/dashboard', '/operacao', '/entregas', '/solicitacoes'].includes(item.href),
                )
                .map((item) => (
                  <NavItem
                    key={item.href}
                    {...item}
                    active={pathname === item.href}
                    badge={item.href === '/solicitacoes' ? received : undefined}
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
              <View style={common.row}>
                <Txt style={styles.breadcrumb}>Aliança Traduções</Txt>
                <ChevronRight size={12} color={colors.muted} />
                <Txt style={styles.breadcrumb}>{section}</Txt>
              </View>
            ) : (
              <Brand wordmarkOnly />
            )}
            <View style={[styles.headerActions, !desktop && { gap: 8 }]}>
              {desktop && (
                <View testID="search-field" style={styles.search}>
                  <Search size={17} color={colors.muted} />
                  <TextInput
                    accessibilityLabel="Buscar projetos"
                    placeholder="Buscar projeto ou cliente..."
                    placeholderTextColor={colors.muted}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => router.push('/operacao')}
                    style={styles.searchInput}
                  />
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
                </View>
              )}
              <View>
                {desktop ? (
                  <IconButton
                    icon={Bell}
                    label="Notificações"
                    onPress={() => setNotifications(true)}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Notificações"
                    onPress={() => setNotifications(true)}
                    style={({ pressed }) => [styles.mobileAction, pressed && { opacity: 0.65 }]}
                  >
                    <Bell size={24} color={colors.ink} strokeWidth={1.8} />
                  </Pressable>
                )}
                {!read && <View pointerEvents="none" style={styles.notificationDot} />}
              </View>
              {!desktop && profileButton}
            </View>
          </View>
          {!desktop && (
            <View testID="search-field" style={styles.mobileSearch}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buscar projetos"
                onPress={() => searchInput.current?.focus()}
                style={styles.searchGlyph}
              >
                <Search size={21} color={colors.muted} />
              </Pressable>
              <TextInput
                ref={searchInput}
                accessibilityLabel="Buscar projetos"
                placeholder="Buscar projetos, tarefas..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                onSubmitEditing={() => router.push('/operacao')}
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
                  pathname === item.href ||
                  (item.href === '/mais' &&
                    mobileMoreModules.some((module) => module.href === pathname));
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
      <Dialog
        open={profile}
        onClose={() => setProfile(false)}
        size="compact"
        eyebrow="CONTA ATUAL"
        title="Meu perfil"
      >
        <View style={common.row}>
          <View style={[styles.avatar, { width: 48, height: 48 }]}>
            <Txt style={{ color: colors.white, fontWeight: '600' }}>{initials}</Txt>
          </View>
          <View>
            <Txt style={{ fontWeight: '600' }}>{session?.name}</Txt>
            <Txt style={common.caption}>{session?.email}</Txt>
          </View>
        </View>
        <Badge>
          {session
            ? `${roleLabel[session.role]}${session.demo ? ' · Demonstração' : ' · Conta autenticada'}`
            : ''}
        </Badge>
        <Txt style={common.caption}>
          Aliança Traduções /{' '}
          {session?.role === 'translator'
            ? 'Portal do tradutor'
            : session?.role === 'hr'
              ? 'Recursos Humanos'
              : 'Gestão da plataforma'}
        </Txt>
        <Button variant="secondary" icon={LogOut} onPress={logout}>
          Sair da conta
        </Button>
      </Dialog>
      <Dialog
        open={notifications}
        onClose={() => setNotifications(false)}
        mobileSheet
        eyebrow="CENTRAL DE ATUALIZAÇÕES"
        title="Notificações"
        description="Acompanhe prazos, entregas e movimentações recentes."
      >
        <Badge tone="neutral">Dados demonstrativos</Badge>
        {[
          [
            'Tradução pronta para revisão',
            'Lucas enviou o contrato de Almeida & Associados.',
            'Há 15 minutos',
          ],
          [
            'Prazo de entrega próximo',
            'O manual da Vértice Engenharia tem entrega hoje.',
            'Há 40 minutos',
          ],
        ].map(([title, text, time]) => (
          <View
            key={title}
            style={{
              gap: 5,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
              paddingBottom: 16,
            }}
          >
            <Txt style={{ fontWeight: '600', fontSize: 13 }}>{title}</Txt>
            <Txt style={common.caption}>{text}</Txt>
            <Txt style={{ fontSize: 10, color: colors.muted }}>{time}</Txt>
          </View>
        ))}
        <Button variant="secondary" onPress={() => setRead(true)} disabled={read}>
          {read ? 'Todas as notificações lidas' : 'Marcar todas como lidas'}
        </Button>
      </Dialog>
      <Dialog
        open={help}
        onClose={() => setHelp(false)}
        size="compact"
        eyebrow="SUPORTE"
        title="Central de ajuda"
      >
        <Badge tone="amber">Demonstração</Badge>
        <Txt>Aliança Traduções</Txt>
        <Txt style={common.caption}>
          Manuais de acesso e documentos institucionais ainda não foram disponibilizados neste
          ambiente.
        </Txt>
        <Button variant="secondary" onPress={() => setHelp(false)}>
          Voltar ao painel
        </Button>
      </Dialog>
      <WorkspaceDialogs />
    </SafeAreaView>
  );
}
