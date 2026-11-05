import { router } from 'expo-router';
import { ArrowRight, CheckCheck, Clock3, FolderKanban, Inbox, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatSelectedDate } from '@/components/ui/fields/date-utils';
import { PageHeading } from '@/components/ui/page-heading';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { useInbox } from '@/features/requests/contexts/inbox-context';
import { Metric } from '@/features/workspace/components/metric';
import { ProjectList } from '@/features/workspace/components/project-list';
import { TaskRow } from '@/features/workspace/components/task-row';
import { WorkspacePage } from '@/features/workspace/components/workspace-page';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { openProject } from '@/features/workspace/utils/open-project';
import { isDueToday, isOpenProject, matchesProjectGroup, nextProject, type ProjectGroup } from '@/features/workspace/utils/project-groups';
import { matchesSearch } from '@/features/workspace/utils/search';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';
import { breakpoints } from '@/theme/tokens';

export function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { projects, tasks, search } = useWorkspace();
  const { session } = useSession();
  const employee = session?.role === 'employee' || session?.role === 'admin';
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'active' | 'all'>('active');
  const { requests } = useInbox();
  const received = requests.filter((item) => item.status === 'Recebido').length;
  const active = projects.filter(isOpenProject);
  const inProgress = projects.filter((p) => matchesProjectGroup(p, 'andamento')).length;
  const waiting = projects.filter((p) => matchesProjectGroup(p, 'aguardando')).length;
  const dueToday = projects.filter(isDueToday);
  const next = nextProject(projects);
  const compact = width < breakpoints.compact;
  const pendingTasks = tasks.filter(task => !task.done);
  const visible = (tab === 'active' ? active : projects).filter((p) => matchesSearch(p, search));
  const openGroup = (grupo: ProjectGroup) => router.push({ pathname: '/operacao', params: { grupo } });
  const date = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  return (
    <WorkspacePage>
      <Txt style={styles.greeting}>Olá, {session?.name.split(' ')[0] || 'bem-vindo'}. Vamos organizar seu dia?</Txt>
      <PageHeading
        title="Visão geral"
        subtitle={`${employee ? 'Projetos da equipe' : 'Meus projetos'} · ${date}`}
        action={
          employee ? (
            <Button icon={Plus} onPress={() => router.push({ pathname: '/operacao/nova', params: { origin: 'dashboard' } })}>
              Nova requisição
            </Button>
          ) : session?.role === 'translator' ? <Button onPress={() => router.push('/entregas')}>Minhas entregas</Button> : undefined
        }
      />
      <View style={[styles.metrics, compact && styles.metricsCompact]}>
        <Metric
          compact={compact}
          icon={FolderKanban}
          title="Em andamento"
          value={inProgress}
          context={`de ${active.length} ${active.length === 1 ? 'projeto' : 'projetos'} em aberto`}
          color={colors.ink}
          onPress={() => openGroup('andamento')}
        />
        <Metric
          compact={compact}
          icon={Clock3}
          title="Aguardando avaliação"
          value={waiting}
          context={waiting ? 'Precisam de uma decisão' : 'Nada aguardando agora'}
          color={colors.amber}
          onPress={() => openGroup('aguardando')}
        />
        <Metric
          compact={compact}
          icon={CheckCheck}
          title="Entrega hoje"
          value={dueToday.length}
          context={dueToday.length ? `Próxima: ${dueToday[0].title}` : 'Nenhum prazo para hoje'}
          color={colors.blue}
          onPress={() => openGroup('hoje')}
        />
      </View>
      {next ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Próximo passo: ${next.title}`}
          onPress={() => openProject(next, 'dashboard')}
          style={({ hovered }) => [styles.activity, hovered && styles.metricHover]}
        >
          <View style={styles.activityIcon}>
            <FolderKanban size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Txt style={common.eyebrow}>Próximo passo</Txt>
            <Txt numberOfLines={compact ? 2 : 1} style={styles.activityTitle}>{next.title}</Txt>
            <Txt numberOfLines={compact ? 2 : 1} style={common.caption}>
              {next.client} · {next.status} · prazo {formatSelectedDate(next.deadline).toLocaleLowerCase('pt-BR')}
            </Txt>
          </View>
          <View style={styles.activityArrow}>
            <ArrowRight size={21} color={colors.ink} />
          </View>
        </Pressable>
      ) : (
        <View style={styles.activity}>
          <View style={styles.activityIcon}>
            <CheckCheck size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt style={styles.activityTitle}>Tudo em dia</Txt>
            <Txt style={common.caption}>Acompanhe aqui os projetos que forem atribuídos à sua conta.</Txt>
          </View>
        </View>
      )}
      {employee && received > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver solicitações do site"
          onPress={() => router.push('/solicitacoes')}
          style={[styles.activity, styles.requestActivity]}
        >
          <View style={styles.activityIcon}>
            <Inbox size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt style={styles.activityTitle}>
              {received} {received === 1 ? 'nova solicitação' : 'novas solicitações'} do site
            </Txt>
            <Txt style={common.caption}>
              Analise os documentos e prepare a proposta para o cliente.
            </Txt>
          </View>
          <ArrowRight size={21} color={colors.accent} />
        </Pressable>
      )}
      <View style={[styles.workGrid, width < breakpoints.wide && { flexDirection: 'column' }]}>
        <View style={styles.projectsSection}>
          <View style={styles.sectionHeader}>
            <Txt style={common.sectionTitle}>Projetos</Txt>
            <Txt style={common.caption}>{active.length} em aberto</Txt>
          </View>
          <SegmentedTabs
            label="Projetos do painel"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'active', label: 'Em aberto', count: active.length },
              { value: 'all', label: 'Todos', count: projects.length },
            ]}
            style={styles.panelTabs}
          />
          <ProjectList projects={visible.slice(0, 5)} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/operacao')}
            style={styles.viewAll}
          >
            <Txt style={styles.viewAllText}>Ver toda a operação</Txt>
            <ArrowRight size={15} color={colors.accent} />
          </Pressable>
        </View>
        <View style={[styles.tasksSection, width < breakpoints.wide && { width: '100%' }]}>
          <View style={styles.sectionHeader}>
            <Txt style={common.sectionTitle}>Minhas tarefas</Txt>
            <Txt style={common.caption}>{tasks.filter((t) => !t.done).length} pendentes</Txt>
          </View>
          <View style={{ marginTop: 15 }}>
            {pendingTasks.slice(0, 4).map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
            {!pendingTasks.length && <EmptyState icon={CheckCheck} title="Tudo em dia" text="Suas tarefas pendentes aparecerão aqui. Você também pode consultar as concluídas." />}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/tarefas')}
            style={styles.viewAll}
          >
            <Txt style={styles.viewAllText}>Ver minhas tarefas</Txt>
            <ArrowRight size={15} color={colors.accent} />
          </Pressable>
        </View>
      </View>
    </WorkspacePage>
  );
}
