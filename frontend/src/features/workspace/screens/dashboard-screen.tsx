import { router } from 'expo-router';
import { ArrowRight, CheckCheck, Clock3, FolderKanban, Inbox, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { useInbox } from '@/features/requests/contexts/inbox-context';
import { FilterTab } from '@/features/workspace/components/filter-tab';
import { Metric } from '@/features/workspace/components/metric';
import { ProjectList } from '@/features/workspace/components/project-list';
import { TaskRow } from '@/features/workspace/components/task-row';
import { WorkspacePage } from '@/features/workspace/components/workspace-page';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { matchesSearch } from '@/features/workspace/utils/search';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

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
  const active = projects.filter((p) => !['Concluído', 'Pronta', 'Entregue'].includes(p.status));
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dueToday = active.filter(p => p.deadline === 'Hoje' || p.deadline === todayISO).length;
  const pendingTasks = tasks.filter(task => !task.done);
  const visible = (tab === 'active' ? active : projects).filter((p) => matchesSearch(p, search));
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
      <View style={[styles.metrics, width < 700 && styles.metricsCompact]}>
        <Metric
          compact={width < 700}
          icon={FolderKanban}
          title="Em andamento"
          value={
            projects.filter((p) =>
              ['Em tradução', 'Em revisão', 'Em andamento', 'Revisão solicitada'].includes(
                p.status,
              ),
            ).length
          }
          color={colors.ink}
        />
        <Metric
          compact={width < 700}
          icon={Clock3}
          title="Aguardando avaliação"
          value={
            projects.filter((p) =>
              ['Aguardando aprovação', 'Aguardando avaliação'].includes(p.status),
            ).length
          }
          color={colors.amber}
        />
        <Metric
          compact={width < 700}
          icon={CheckCheck}
          title="Entrega hoje"
          value={dueToday}
          color={colors.blue}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Acompanhar projetos em andamento"
        onPress={() => router.push('/operacao')}
        style={({ hovered }) => [styles.activity, hovered && { backgroundColor: colors.elevated }]}
      >
        <View style={styles.activityIcon}>
          <FolderKanban size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt style={styles.activityTitle}>{dueToday > 0 ? `${dueToday} ${dueToday === 1 ? 'entrega para hoje' : 'entregas para hoje'}` : 'Seu próximo passo'}</Txt>
          <Txt style={common.caption}>{dueToday > 0 ? 'Confira os prazos e avance nos projetos prioritários.' : active.length > 0 ? `${active.length} projetos em aberto para acompanhar.` : 'Acompanhe aqui os projetos que forem atribuídos à sua conta.'}</Txt>
        </View>
        <View style={styles.activityArrow}>
          <ArrowRight size={21} color={colors.ink} />
        </View>
      </Pressable>
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
      <View style={[styles.workGrid, width < 1280 && { flexDirection: 'column' }]}>
        <View style={styles.projectsSection}>
          <View style={styles.sectionHeader}>
            <Txt style={common.sectionTitle}>Projetos</Txt>
            <Txt style={common.caption}>{active.length} em aberto</Txt>
          </View>
          <View style={styles.tabs}>
            <FilterTab
              label={`Em aberto (${active.length})`}
              active={tab === 'active'}
              onPress={() => setTab('active')}
            />
            <FilterTab
              label={`Todos (${projects.length})`}
              active={tab === 'all'}
              onPress={() => setTab('all')}
            />
          </View>
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
        <View style={[styles.tasksSection, width < 1280 && { width: '100%' }]}>
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
