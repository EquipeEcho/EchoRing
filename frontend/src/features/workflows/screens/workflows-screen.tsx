import { AlertTriangle, CheckCircle2, GitBranch, RefreshCw, UsersRound } from 'lucide-react-native';
import { ActivityIndicator, Pressable, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { WorkspacePage } from '@/features/workspace/components/workspace-page';
import { useTheme } from '@/theme/theme-context';

import { WorkflowJobCard } from '../components/workflow-job-card';
import { WorkflowJobDetails } from '../components/workflow-job-details';
import { RecordPage } from '@/features/workspace/components/record-page';
import { workflowTemplates } from '../data/workflow-templates';
import { WorkflowLibrary, WorkflowTemplateDetails } from '../components/workflow-library';
import { useWorkflows } from '../hooks/use-workflows';
import { useStyles } from '../styles/workflows.styles';
import { emptyFilters, isFinished, isOverdue, needsAttention } from '../utils/workflow-utils';

export function WorkflowsScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 800;
  const { session } = useSession();
  const state = useWorkflows();
  const { tab, setTab } = state;
  const template = workflowTemplates.find(item => item.id === state.templateId);
  const metrics = [
    { label: 'Trabalhos ativos', value: state.filtered.filter(job => !isFinished(job)).length, color: colors.blue, icon: GitBranch },
    { label: 'Precisam de atenção', value: state.filtered.filter(job => needsAttention(job, state.now)).length, color: colors.amber, icon: AlertTriangle },
    { label: 'Atrasados', value: state.filtered.filter(job => isOverdue(job, state.now)).length, color: colors.red, icon: AlertTriangle },
    { label: 'Concluídos', value: state.filtered.filter(isFinished).length, color: colors.green, icon: CheckCircle2 },
  ];
  if (state.selectedId) return <RecordPage key={state.selectedId} title={state.selected?.title || 'Detalhes do trabalho'}
    eyebrow={`${state.selectedId} · ${state.simulated ? 'EXEMPLO FICTÍCIO' : 'SERVIÇO REAL'}`}
    backLabel="Voltar aos workflows" backHref={state.listHref} loading={state.loading && !state.selected}
    error={!state.selected ? state.error || (!state.loading ? 'Trabalho não encontrado ou indisponível para esta conta.' : '') : undefined} onRetry={state.refresh}>
    {state.selected && <WorkflowJobDetails job={state.selected} now={state.now} onRefresh={state.refresh} />}
  </RecordPage>;
  if (state.templateId) return <RecordPage title={template?.title || 'Modelo não encontrado'} eyebrow="BIBLIOTECA DE PROCESSOS"
    description={template?.description} backLabel="Voltar aos modelos" backHref={{ ...state.listHref, params: { ...state.listHref.params, tab: 'templates' } }}
    error={!template ? 'Este modelo de workflow não está disponível.' : undefined}>
    {template && <WorkflowTemplateDetails template={template} />}
  </RecordPage>;
  return <WorkspacePage showProjectStatus={!state.simulated}>
    <PageHeading title={state.staff ? 'Acompanhamento de Workflows' : 'Workflows'} subtitle={state.staff ? 'Uma visão dos serviços, das pessoas e de cada etapa do trabalho.' : 'Entenda cada processo e acompanhe as etapas dos seus trabalhos.'}
      action={!session?.demo ? <Button variant="secondary" onPress={state.changeSource}>{state.simulated ? 'Voltar aos serviços reais' : 'Ver exemplos demonstrativos'}</Button> : undefined} />
    <View style={s.stack}>
      <View style={[s.banner, state.simulated && s.demoBanner]} testID="workflow-source-notice">
        <View style={s.row}><Badge tone={state.simulated ? 'amber' : 'blue'}>{state.simulated ? 'Dados demonstrativos' : 'Serviços reais'}</Badge><Txt style={s.detailLabel}>{state.simulated ? 'Conheça o acompanhamento com exemplos' : 'Informações disponíveis no portal'}</Txt></View>
        <Txt style={s.muted}>{state.simulated ? 'Os trabalhos, nomes, responsáveis, etapas e prazos abaixo são fictícios. Estes exemplos não alteram seus serviços.' : 'Etapas, responsáveis e bloqueios são registrados no trabalho. O percentual considera as etapas concluídas. Serviços anteriores precisam de um workflow atribuído pela equipe.'}</Txt>
      </View>
      <View style={s.tabs} role="tablist" accessibilityLabel="Áreas de workflows">
        {(['jobs', 'templates'] as const).map(value => <Pressable key={value} accessibilityRole="tab" aria-selected={tab === value} accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[s.tab, tab === value && s.tabActive]}>
          <Txt style={[s.tabText, tab === value && { color: colors.accent }]}>{value === 'templates' ? 'Modelos de workflow' : state.staff ? 'Acompanhamento' : 'Meus trabalhos'}</Txt>
        </Pressable>)}
      </View>
      {tab === 'templates' ? <WorkflowLibrary compact={compact} onOpen={template => state.openTemplate(template.id)} /> : <>
        <View style={{ gap: 9 }}>
          <Txt style={s.muted}>Resumo dos trabalhos</Txt>
          <View style={s.metrics}>{metrics.map(metric => <View key={metric.label} style={s.metric}><metric.icon size={18} color={metric.color} /><Txt style={[s.metricNumber, { color: metric.color }]}>{metric.value}</Txt><Txt style={s.muted}>{metric.label}</Txt></View>)}</View>
        </View>
        {state.staff && <View style={{ gap: 12 }}>
          <View style={s.row}><UsersRound size={18} color={colors.accent} /><Txt accessibilityRole="header" style={s.sectionTitle}>Tradutores com trabalhos ativos</Txt><Badge tone="neutral">{state.translators.length}</Badge></View>
          <Txt style={s.muted}>Todos os tradutores identificados nos trabalhos ativos desta fonte. Selecione um profissional para filtrar a lista.</Txt>
          <View style={s.translators}>
            {state.translators.map(translator => <Pressable key={translator.id} accessibilityRole="button" accessibilityLabel={`Filtrar trabalhos de ${translator.name}`} accessibilityState={{ selected: state.filters.translator === translator.id }} onPress={() => state.setFilters({ ...state.filters, translator: state.filters.translator === translator.id ? '' : translator.id })} style={({ hovered }) => [s.translator, compact && { flexBasis: '100%', minWidth: 0 }, state.filters.translator === translator.id && s.translatorSelected, hovered && { borderColor: colors.accent }]}>
              <Txt style={s.detailLabel}>{translator.name}</Txt><Txt style={s.muted}>{translator.jobs.length} {translator.jobs.length === 1 ? 'trabalho ativo' : 'trabalhos ativos'}</Txt>
              {translator.attention > 0 && <Txt style={[s.muted, { color: colors.amber }]}>{translator.attention} {translator.attention === 1 ? 'precisa' : 'precisam'} de atenção</Txt>}
            </Pressable>)}
          </View>
          {!state.translators.length && !state.loading && <Txt style={s.muted}>Nenhum tradutor identificado com trabalhos ativos.</Txt>}
          {state.jobs.some(job => !job.translator && !isFinished(job)) && <Txt style={s.muted}>Há serviços ativos sem identificação do tradutor. Eles continuam disponíveis na lista abaixo.</Txt>}
        </View>}
        <View style={s.between}>
          <View style={{ gap: 4 }}><Txt accessibilityRole="header" style={s.sectionTitle}>{state.staff ? 'Trabalhos e etapas' : 'Seus trabalhos e etapas'}</Txt><Txt accessibilityLiveRegion="polite" style={s.muted}>{state.filtered.length} {state.filtered.length === 1 ? 'trabalho encontrado' : 'trabalhos encontrados'}</Txt></View>
          {!state.simulated && <Button icon={RefreshCw} variant="ghost" onPress={state.refresh} disabled={state.loading}>Atualizar serviços</Button>}
        </View>
        {state.loading && <ActivityIndicator accessibilityLabel="Carregando serviços dos workflows" color={colors.accent} />}
        <View style={s.grid}>{state.filtered.map(job => <WorkflowJobCard key={job.id} job={job} now={state.now} compact={compact} onOpen={() => state.openJob(job.id)} />)}</View>
        {!state.filtered.length && !state.loading && <EmptyState icon={GitBranch} title={state.error ? 'Serviços indisponíveis' : state.jobs.length ? 'Nenhum trabalho para este tradutor' : 'Nenhum serviço disponível'} text={state.error ? 'Tente atualizar os serviços. A biblioteca de modelos continua disponível.' : state.jobs.length ? 'Selecione outro profissional ou volte a ver todos os trabalhos.' : 'Quando houver serviços atribuídos, eles aparecerão aqui. Você já pode consultar os modelos de workflow.'}
          action={state.jobs.length ? <Button variant="secondary" onPress={() => state.setFilters(emptyFilters)}>Ver todos os trabalhos</Button> : <Button variant="secondary" onPress={() => setTab('templates')}>Consultar modelos</Button>} />}
      </>}
    </View>
  </WorkspacePage>;
}
