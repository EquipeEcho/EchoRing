import { router } from 'expo-router';
import { Activity, FolderKanban, Search, UserPlus, UsersRound } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterSelect } from '@/components/ui/fields/filter-select';
import { PageHeading } from '@/components/ui/page-heading';
import { SkeletonList } from '@/components/ui/skeleton';
import { TextInput } from '@/components/ui/text-input';
import { Txt } from '@/components/ui/text';
import { Metric } from '@/features/workspace/components/metric';
import { useSession } from '@/features/auth/contexts/session-context';
import { listClients } from '@/features/clients/services/client-service';
import { type Client, type ClientProject } from '@/features/clients/types';
import { useCommonStyles } from '@/theme/common.styles';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';

type ProjectFilter = 'all' | 'with-projects' | 'without-projects' | 'active' | 'completed' | 'canceled';
type SortOrder = 'newest' | 'oldest';

const interactiveMotion: ViewStyle & { transitionDuration?: string; transitionProperty?: string } =
  Platform.OS === 'web'
    ? {
        transitionDuration: '160ms',
        transitionProperty: 'background-color, border-color, opacity',
      } as ViewStyle & { transitionDuration?: string; transitionProperty?: string }
    : {};

const isCompleted = (status: string) =>
  ['entregue', 'pronta', 'concluído', 'concluída', 'concluido', 'concluida'].includes(status.trim().toLowerCase());

const isCanceled = (status: string) =>
  ['cancelado', 'cancelada', 'orçamento recusado', 'orcamento recusado'].includes(status.trim().toLowerCase());

function isActive(project: ClientProject) {
  return !isCompleted(project.status) && !isCanceled(project.status);
}

function statusTone(status: string): 'green' | 'amber' | 'red' | 'blue' {
  if (isCompleted(status)) return 'green';
  if (isCanceled(status)) return 'red';
  if (status.trim().toLowerCase() === 'recebido') return 'blue';
  return 'amber';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CL';
}

export function ClientsListScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { colors } = useTheme();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(width);
  const compact = contentWidth < 700;
  const stackedToolbar = contentWidth < 900;
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      setClients(await listClients(session));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    return () => clearTimeout(initial);
  }, [load]);

  const projects = useMemo(() => clients.flatMap((client) => client.projects), [clients]);
  const activeProjects = projects.filter(isActive).length;
  const completedProjects = projects.filter((project) => isCompleted(project.status)).length;
  const canceledProjects = projects.filter((project) => isCanceled(project.status)).length;
  const clientsWithProjects = clients.filter((client) => client.projects.length > 0).length;

  const filterOptions = useMemo(() => [
    { value: 'all' as const, label: 'Todos os clientes', count: clients.length },
    { value: 'with-projects' as const, label: 'Com projetos', count: clientsWithProjects },
    { value: 'without-projects' as const, label: 'Sem projetos', count: clients.length - clientsWithProjects },
    { value: 'active' as const, label: 'Projetos ativos', count: activeProjects },
    { value: 'completed' as const, label: 'Projetos concluídos', count: completedProjects },
    { value: 'canceled' as const, label: 'Projetos cancelados', count: canceledProjects },
  ], [activeProjects, canceledProjects, clients.length, clientsWithProjects, completedProjects]);

  const visibleClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return clients
      .filter((client) => !term || client.name.toLocaleLowerCase().includes(term) || client.email.toLocaleLowerCase().includes(term))
      .filter((client) => {
        if (projectFilter === 'with-projects') return client.projects.length > 0;
        if (projectFilter === 'without-projects') return client.projects.length === 0;
        if (projectFilter === 'active') return client.projects.some(isActive);
        if (projectFilter === 'completed') return client.projects.some((project) => isCompleted(project.status));
        if (projectFilter === 'canceled') return client.projects.some((project) => isCanceled(project.status));
        return true;
      })
      .sort((first, second) => {
        const firstDate = Date.parse(first.createdAt);
        const secondDate = Date.parse(second.createdAt);
        const order = (Number.isNaN(firstDate) ? 0 : firstDate) - (Number.isNaN(secondDate) ? 0 : secondDate);
        return sortOrder === 'newest' ? -order : order;
      });
  }, [clients, projectFilter, search, sortOrder]);

  const registerButton = (
    <Button icon={UserPlus} onPress={() => router.push('/clientes/cadastrar')} style={styles.interactiveMotion}>
      Cadastrar cliente
    </Button>
  );

  return (
    <ScrollView
      testID="clients-scroll"
      style={{ flex: 1 }}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
    >
      <PageHeading
        title="Clientes"
        subtitle="Clientes cadastrados na plataforma."
        action={registerButton}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Txt accessibilityRole="alert" style={styles.error}>
            {error}
          </Txt>
          <Button variant="secondary" onPress={() => void load()}>
            Tentar novamente
          </Button>
        </View>
      ) : (
        <>
          <View style={[styles.metrics, compact && styles.metricsCompact]}>
            <Metric title="Clientes cadastrados" value={clients.length} color={colors.accent} icon={UsersRound} compact={stackedToolbar} />
            <Metric title="Projetos cadastrados" value={projects.length} color={colors.blue} icon={FolderKanban} compact={stackedToolbar} />
            <Metric title="Projetos ativos" value={activeProjects} color={colors.amber} icon={Activity} compact={stackedToolbar} />
          </View>
          {clients.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Nenhum cliente cadastrado"
              text="Cadastre o primeiro cliente para vê-lo aqui."
              action={registerButton}
            />
          ) : (
            <View style={styles.directory}>
              <View style={[styles.toolbar, stackedToolbar && styles.toolbarStacked]}>
                <View style={[styles.search, styles.interactiveMotion, searchFocused && styles.searchFocused, stackedToolbar && styles.searchFull]}>
                  <Search size={18} color={colors.muted} />
                  <TextInput
                    accessibilityLabel="Buscar clientes por nome ou e-mail"
                    value={search}
                    onChangeText={setSearch}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder="Buscar por nome ou e-mail"
                    placeholderTextColor={colors.muted}
                    style={styles.searchInput}
                  />
                </View>
                <View style={[styles.filters, stackedToolbar && styles.filtersStacked]}>
                  <FilterSelect
                    label="Projetos dos clientes"
                    value={projectFilter}
                    options={filterOptions}
                    onChange={setProjectFilter}
                    style={[styles.filter, styles.interactiveMotion]}
                  />
                  <FilterSelect
                    label="Ordenar por cadastro"
                    value={sortOrder}
                    options={[
                      { value: 'newest', label: 'Mais recentes' },
                      { value: 'oldest', label: 'Mais antigos' },
                    ]}
                    onChange={setSortOrder}
                    style={[styles.filter, styles.interactiveMotion]}
                  />
                </View>
              </View>
              <View style={styles.listHeading}>
                <Txt style={styles.listTitle}>Lista de clientes</Txt>
                <Txt accessibilityLiveRegion="polite" style={common.caption}>
                  {visibleClients.length} {visibleClients.length === 1 ? 'cliente' : 'clientes'}
                </Txt>
              </View>
              {visibleClients.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="Nenhum resultado encontrado"
                  text="Ajuste a pesquisa ou os filtros para encontrar clientes."
                />
              ) : (
                <View style={styles.list}>
                  {visibleClients.map((client) => (
                    <Pressable
                      key={client.id}
                      accessible={false}
                      style={({ hovered, pressed }) => [
                        styles.clientCard,
                        styles.interactiveMotion,
                        (hovered || pressed) && styles.clientCardHover,
                      ]}
                    >
                      <View style={styles.clientHeader}>
                        <View style={styles.identity}>
                          <View style={styles.avatar}>
                            <Txt style={styles.avatarText}>{initials(client.name)}</Txt>
                          </View>
                          <View style={styles.identityCopy}>
                            <Txt numberOfLines={1} style={styles.name}>{client.name}</Txt>
                            <Txt numberOfLines={1} style={common.caption}>{client.email}</Txt>
                            {client.company ? (
                              <Txt numberOfLines={1} style={styles.company}>{client.company}</Txt>
                            ) : null}
                          </View>
                        </View>
                        <View style={styles.registration}>
                          <Txt style={styles.registrationLabel}>Cadastro</Txt>
                          <Txt style={styles.registrationDate}>{formatDate(client.createdAt) || '—'}</Txt>
                        </View>
                      </View>
                      <View style={styles.projects}>
                        <View style={styles.projectsHeading}>
                          <Txt style={styles.projectsTitle}>Projetos ({client.projects.length})</Txt>
                        </View>
                        {client.projects.length ? (
                          <View style={styles.projectList}>
                            {client.projects.map((project) => (
                              <View key={project.id} style={[styles.project, compact && styles.projectCompact]}>
                                <View style={styles.projectCopy}>
                                  <Txt numberOfLines={2} style={styles.projectName}>{project.title}</Txt>
                                  <Txt style={styles.projectMeta}>
                                    {project.service} · {formatDate(project.createdAt) || 'Data não disponível'}
                                  </Txt>
                                </View>
                                <Badge dot tone={statusTone(project.status)}>{project.status}</Badge>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Txt style={styles.noProjects}>Nenhum projeto cadastrado.</Txt>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  page: { width: '100%', maxWidth: 1200, alignSelf: 'center', flexGrow: 1 },
  interactiveMotion,
  metrics: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  metricsCompact: { gap: 10 },
  center: { alignItems: 'center', gap: 14, paddingVertical: 44 },
  error: {
    color: colors.red,
    fontSize: 13,
    lineHeight: 20,
    padding: 12,
    backgroundColor: colors.redSoft,
    borderRadius: 10,
  },
  directory: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.surface,
    boxShadow: colors.cardShadow,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  toolbarStacked: { alignItems: 'stretch' },
  search: {
    flex: 1,
    minWidth: 220,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.controlLine,
    borderRadius: 10,
    backgroundColor: colors.canvas,
  },
  searchFull: { width: '100%', minWidth: 0 },
  searchFocused: { borderColor: colors.accent },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 10, fontSize: 14, color: colors.ink },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filtersStacked: { width: '100%' },
  filter: { flex: 1, minWidth: 150 },
  listHeading: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  listTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  list: { gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  clientCard: {
    gap: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  clientCardHover: { borderColor: colors.controlLine, backgroundColor: colors.elevated, opacity: 0.98 },
  clientHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 },
  identity: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: {
    width: 46,
    height: 46,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.accentSoft,
  },
  avatarText: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  identityCopy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  company: { fontSize: 12, lineHeight: 18, color: colors.muted },
  registration: { alignItems: 'flex-end', gap: 2 },
  registrationLabel: { fontSize: 11, lineHeight: 16, color: colors.muted },
  registrationDate: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  projects: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  projectsHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  projectsTitle: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  projectList: { gap: 8 },
  project: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.elevated,
  },
  projectCompact: { alignItems: 'flex-start' },
  projectCopy: { flex: 1, minWidth: 160, gap: 3 },
  projectName: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  projectMeta: { fontSize: 12, lineHeight: 18, color: colors.muted },
  noProjects: { fontSize: 13, lineHeight: 20, color: colors.muted },
}));
