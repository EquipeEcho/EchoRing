import { router } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { formatSelectedDate } from '@/components/ui/fields/date-utils';
import { languageCode } from '@/data/language-options';
import { type TranslationRequest } from '@/features/requests/types';
import { requestTargets, requestTasks, workTargets } from '@/features/requests/utils/quote-scope';
import { useStyles } from '@/features/requests/styles/requests.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { money } from '@/utils/formatters';

export function RequestJobs({ request }: { request: TranslationRequest }) {
  const styles = useStyles();
  const common = useCommonStyles();
  const tasks = requestTasks(request);
  const approved = workTargets(request);
  const delivered = tasks.filter(task => task.status === 'Entregue').length;
  return <View style={styles.sectionBlock}>
    <Txt style={styles.sectionEyebrow}>ORDEM DE SERVIÇO · {request.id}</Txt>
    <Txt style={styles.sectionTitle}>{delivered} de {approved.length} idiomas aprovados entregues</Txt>
    {request.approvedAmount && <Txt style={common.caption}>Valor aprovado: {money(request.approvedAmount)}</Txt>}
    <Txt style={common.caption}>Os documentos originais deste pedido são compartilhados entre os trabalhos. Cada idioma possui responsável, prazo, versões e revisão independentes.</Txt>
    {requestTargets(request).map(target => {
      const accepted = approved.some(item => languageCode(item) === languageCode(target));
      const task = tasks.find(task => languageCode(task.target || request.target) === languageCode(target));
      const item = request.quote?.items?.find(item => languageCode(item.target) === languageCode(target));
      return <View key={target} style={[styles.waiting, { flexDirection: 'column', alignItems: 'stretch' }]}>
        <Txt style={styles.sectionTitle}>{request.source} → {target}</Txt>
        <Badge dot tone={!accepted ? 'neutral' : task?.status === 'Entregue' ? 'green' : 'blue'}>
          {!accepted ? 'Não aprovado pelo cliente' : task?.status || 'Aguardando atribuição'}
        </Badge>
        {item && <Txt style={common.caption}>{money(item.amount)} · Prazo comercial: {formatSelectedDate(item.delivery)}</Txt>}
        {task ? <>
          <Txt style={common.caption}>Responsável: {task.translator?.name || 'Não informado'}</Txt>
          <Txt style={common.caption}>{task.id} · Prazo do trabalho: {formatSelectedDate(task.deadline)}</Txt>
          <Button variant="secondary" onPress={() => router.push({ pathname: '/workflows', params: { task: task.id } })}>
            Acompanhar workflow de {target}
          </Button>
        </> : accepted && <Txt style={common.caption}>Envie uma oferta para atribuir este idioma a um tradutor.</Txt>}
      </View>;
    })}
  </View>;
}
