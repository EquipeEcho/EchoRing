import { View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

import { Badge } from '@/components/ui/badge';
import { Txt } from '@/components/ui/text';
import { useOfferStyles } from '@/features/offers/styles/offers.styles';
import { type Offer, offerLabels } from '@/features/offers/types';
import { money } from '@/utils/formatters';
import { formatSelectedDate } from '@/components/ui/fields/date-utils';
import { workflowTemplates } from '@/features/workflows/data/workflow-templates';
import { useTheme } from '@/theme/theme-context';

export function OfferSummary({ offer }: { offer: Offer }) {
  const s = useOfferStyles();
  const { colors } = useTheme();
  return <View style={s.stack}>
    <View style={s.row}>
      <Badge tone={offer.status === 'accepted' ? 'green' : offer.status === 'pending' ? 'blue' : 'neutral'}>{offerLabels[offer.status]}</Badge>
      <Txt style={s.caption}>{offer.service}</Txt>
    </View>
    <View style={s.identity}>
      <Txt accessibilityRole="header" style={s.title}>{offer.title}</Txt>
      <View style={s.languagePair}>
        <Txt style={s.language}>{offer.source}</Txt>
        <ArrowRight size={16} color={colors.muted} />
        <Txt style={s.language}>{offer.target}</Txt>
      </View>
    </View>
    {offer.audience === 'all' && <Badge tone="blue">Publicada para todos os tradutores</Badge>}
    {offer.workflowTemplateId && <Txt style={s.caption}>Workflow: {workflowTemplates.find(item => item.id === offer.workflowTemplateId)?.title}</Txt>}
    {offer.eligible === false && offer.status === 'pending' && <Txt style={s.caption}>Para aceitar, seu perfil precisa incluir {offer.source} e {offer.target} entre os idiomas que você domina.</Txt>}
    <View style={s.terms}>
      <View style={s.term}><Txt style={s.caption}>Volume</Txt><Txt style={s.termValue}>{offer.volume}</Txt></View>
      <View style={s.term}><Txt style={s.caption}>Prazo</Txt><Txt style={s.termValue}>{formatSelectedDate(offer.deadline)}</Txt></View>
    </View>
    <View style={s.payment}>
      <Txt style={s.caption}>Remuneração do tradutor</Txt>
      <Txt style={s.amount}>{money(offer.compensation)}</Txt>
    </View>
    <Txt style={s.caption}>Responder até {new Date(offer.expiresAt).toLocaleString('pt-BR')}</Txt>
  </View>;
}
