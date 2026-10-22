import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Txt } from '@/components/ui/text';
import { useOfferStyles } from '@/features/offers/styles/offers.styles';
import { type Offer, offerLabels } from '@/features/offers/types';
import { money } from '@/utils/formatters';
import { formatSelectedDate } from '@/components/ui/fields/date-utils';
import { workflowTemplates } from '@/features/workflows/data/workflow-templates';

export function OfferSummary({ offer }: { offer: Offer }) {
  const s = useOfferStyles();
  return <View style={s.stack}>
    <View style={s.row}>
      <Badge tone={offer.status === 'accepted' ? 'green' : offer.status === 'pending' ? 'blue' : 'neutral'}>{offerLabels[offer.status]}</Badge>
      <Txt style={s.caption}>{offer.service}</Txt>
    </View>
    <Txt style={s.title}>{offer.title}</Txt>
    <Txt>{offer.source} → {offer.target}</Txt>
    {offer.audience === 'all' && <Badge tone="blue">Publicada para todos os tradutores</Badge>}
    {offer.workflowTemplateId && <Txt style={s.caption}>Workflow: {workflowTemplates.find(item => item.id === offer.workflowTemplateId)?.title}</Txt>}
    {offer.eligible === false && offer.status === 'pending' && <Txt style={s.caption}>Para aceitar, seu perfil precisa incluir {offer.source} e {offer.target} entre os idiomas que você domina.</Txt>}
    <Txt style={s.caption}>Volume: {offer.volume}</Txt>
    <Txt style={s.caption}>Prazo: {formatSelectedDate(offer.deadline)}</Txt>
    <View>
      <Txt style={s.caption}>Remuneração do tradutor</Txt>
      <Txt style={s.amount}>{money(offer.compensation)}</Txt>
    </View>
    <Txt style={s.caption}>Responder até {new Date(offer.expiresAt).toLocaleString('pt-BR')}</Txt>
  </View>;
}
