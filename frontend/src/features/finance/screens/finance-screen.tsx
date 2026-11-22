import { BadgeDollarSign, FolderKanban, UsersRound, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useFinanceOverview } from '@/features/finance/hooks/use-finance-overview';
import { useStyles } from '@/features/finance/styles/finance.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';
import { brl } from '@/utils/formatters';

export function FinanceScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(width);
  const compact = contentWidth < 720;
  const { overview, loading, error, load } = useFinanceOverview();
  const stats = overview
    ? [
        ['Receita aprovada', brl(overview.revenue)],
        ['Gasto com tradutores', brl(overview.cost)],
        ['Lucro médio por projeto', brl(overview.averageProfit)],
        ['Projetos aprovados', String(overview.approvedProjects)],
      ]
    : [];
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.page, width < 700 && styles.pageSmall]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
        <PageHeading
          title="Financeiro"
          subtitle="Receita, gastos com tradutores e lucro dos projetos aprovados."
        />
        {!!error && (
          <View style={styles.errorBox}>
            <Txt accessibilityRole="alert" style={styles.error}>
              {error}
            </Txt>
            <Button variant="secondary" onPress={() => void load()}>
              Tentar novamente
            </Button>
          </View>
        )}
        {loading && !overview && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} accessibilityLabel="Carregando financeiro" />
            <Txt style={common.caption}>Carregando dados financeiros...</Txt>
          </View>
        )}
        {overview && (
          <>
            <View style={[styles.card, styles.overview, contentWidth < 900 && styles.overviewSmall]}>
              <View style={styles.overviewLead}>
                <View style={styles.overviewIcon}>
                  <Wallet size={23} color={colors.muted} />
                </View>
                <View>
                  <Txt style={styles.eyebrow}>SALDO DA EMPRESA</Txt>
                  <Txt style={[styles.balance, { color: overview.balance < 0 ? colors.red : colors.green }]}>
                    {brl(overview.balance)}
                  </Txt>
                </View>
              </View>
              <View style={styles.stats}>
                {stats.map(([label, value]) => (
                  <View key={label} style={styles.stat}>
                    <Txt style={styles.statValue}>{value}</Txt>
                    <Txt style={styles.statLabel}>{label}</Txt>
                  </View>
                ))}
              </View>
            </View>
            <View style={[styles.columns, compact && styles.columnsSmall]}>
              <View style={[styles.card, styles.panel]}>
                <View style={styles.panelHead}>
                  <Txt accessibilityRole="header" style={styles.panelTitle}>Projetos mais lucrativos</Txt>
                  <Txt style={styles.panelSubtitle}>Ganho de cada projeto aprovado: receita menos o custo com tradutores.</Txt>
                </View>
                {overview.projects.length ? (
                  overview.projects.map((project, index) => (
                    <View key={project.id} style={[styles.row, compact && styles.rowSmall]}>
                      <Txt style={styles.rank}>{index + 1}º</Txt>
                      <View style={styles.rowCopy}>
                        <Txt numberOfLines={1} style={styles.rowTitle}>{project.title || project.id}</Txt>
                        <Txt numberOfLines={1} style={styles.rowMeta}>
                          {project.client} · Receita {brl(project.revenue)} · Custo {brl(project.cost)}
                        </Txt>
                      </View>
                      <View style={styles.amount}>
                        <Txt style={[styles.amountValue, { color: project.profit < 0 ? colors.red : colors.green }]}>
                          {brl(project.profit)}
                        </Txt>
                        <Txt style={styles.rowMeta}>lucro</Txt>
                      </View>
                    </View>
                  ))
                ) : (
                  <EmptyState
                    icon={FolderKanban}
                    title="Nenhum projeto aprovado"
                    text="Os projetos aparecem aqui quando o cliente aprova o orçamento."
                  />
                )}
              </View>
              <View style={[styles.card, styles.panel]}>
                <View style={styles.panelHead}>
                  <Txt accessibilityRole="header" style={styles.panelTitle}>Gasto com tradutores</Txt>
                  <Txt style={styles.panelSubtitle}>Total pago a cada tradutor, do maior para o menor.</Txt>
                </View>
                {overview.topTranslator && (
                  <View style={styles.highlight}>
                    <BadgeDollarSign size={20} color={colors.amber} />
                    <View style={styles.rowCopy}>
                      <Txt style={styles.rowMeta}>Tradutor mais caro</Txt>
                      <Txt numberOfLines={1} style={styles.rowTitle}>{overview.topTranslator.name}</Txt>
                    </View>
                    <Badge tone="amber">{brl(overview.topTranslator.total)}</Badge>
                  </View>
                )}
                {overview.translators.length ? (
                  overview.translators.map((translator) => (
                    <View key={translator.id} style={[styles.row, compact && styles.rowSmall]}>
                      <View style={styles.rowCopy}>
                        <Txt numberOfLines={1} style={styles.rowTitle}>{translator.name}</Txt>
                        <Txt style={styles.rowMeta}>
                          {translator.tasks === 1 ? '1 tarefa' : `${translator.tasks} tarefas`}
                        </Txt>
                      </View>
                      <Txt style={styles.amountValue}>{brl(translator.total)}</Txt>
                    </View>
                  ))
                ) : (
                  <EmptyState
                    icon={UsersRound}
                    title="Nenhum pagamento registrado"
                    text="Os gastos aparecem quando uma tarefa tem remuneração do tradutor."
                  />
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
