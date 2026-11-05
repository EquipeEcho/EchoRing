import { router } from 'expo-router';
import { CalendarClock, FileCheck2, UserRound, Wallet } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatSelectedDate } from '@/components/ui/fields/date-utils';
import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/requests/styles/requests.styles';
import { type TranslationRequest } from '@/features/requests/types';
import { requestTasks } from '@/features/requests/utils/quote-scope';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';
import { money } from '@/utils/formatters';

/** Total, delivery date and assigned translators once the quote leaves the draft stage. */
export function RequestSummary({ request }: { request: TranslationRequest }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const tasks = requestTasks(request);
  const translators = [...new Set(tasks.map(task => task.translator?.name).filter(Boolean))];
  const deadline = request.quote?.delivery || tasks.map(task => task.deadline).filter(Boolean).sort().at(-1) || '';
  const items = [
    { icon: Wallet, label: 'Valor total', value: money(request.approvedAmount || request.quote?.amount || '') },
    { icon: CalendarClock, label: 'Prazo estimado de entrega', value: deadline ? formatSelectedDate(deadline) : 'A definir' },
    { icon: UserRound, label: translators.length > 1 ? 'Tradutores responsáveis' : 'Tradutor responsável',
      value: translators.length ? translators.join(', ') : request.status === 'Orçamento recusado' ? 'Não se aplica' : 'Ainda não atribuído' },
  ];
  return (
    <View style={styles.summaryCard}>
      <Txt style={styles.sectionEyebrow}>RESUMO DO ORÇAMENTO</Txt>
      <View style={styles.summaryItems}>
        {items.map(({ icon: Icon, label, value }) => (
          <View key={label} style={styles.summaryItem}>
            <View style={styles.summaryIcon}>
              <Icon size={18} color={colors.muted} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Txt style={styles.detailLabel}>{label}</Txt>
              <Txt style={styles.summaryValue}>{value}</Txt>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Where each translated file stands; uploads and reviews stay in Entregas. */
export function RequestDeliveries({ request }: { request: TranslationRequest }) {
  const styles = useStyles();
  const common = useCommonStyles();
  const { colors } = useTheme();
  const tasks = requestTasks(request);
  return (
    <View style={styles.deliveryBlock}>
      <View style={common.row}>
        <FileCheck2 size={18} color={colors.muted} />
        <Txt style={styles.sectionEyebrow}>TRADUÇÃO FINAL</Txt>
      </View>
      {!tasks.length && (
        <Txt style={common.caption}>
          O arquivo traduzido aparece aqui depois que o tradutor enviar a entrega pela área de Entregas.
        </Txt>
      )}
      {tasks.map(task => {
        const delivered = task.status === 'Entregue';
        return (
          <View key={task.id} style={styles.deliveryRow}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Txt style={{ fontSize: 13, fontWeight: '600' }}>
                {request.source} → {task.target || request.target}
              </Txt>
              <Txt style={common.caption}>
                {delivered && task.deliveredAt
                  ? `Enviada ao cliente em ${new Date(task.deliveredAt).toLocaleDateString('pt-BR')}`
                  : task.status === 'Aguardando avaliação'
                    ? 'Arquivo recebido; aguarda a avaliação da equipe.'
                    : 'O tradutor ainda não enviou a versão final.'}
              </Txt>
            </View>
            <Badge dot tone={delivered ? 'green' : task.status === 'Aguardando avaliação' ? 'amber' : 'blue'}>
              {task.status}
            </Badge>
            <Button variant="secondary" onPress={() => router.push({ pathname: '/entregas', params: { task: task.id } })}>
              {tasks.length > 1 ? `Abrir entrega de ${task.target || request.target}` : 'Abrir entrega'}
            </Button>
          </View>
        );
      })}
    </View>
  );
}
