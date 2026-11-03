import { useWindowDimensions, View } from 'react-native';

import { DateSelectField } from '@/components/ui/fields/date-select-field';
import { Txt } from '@/components/ui/text';
import { TextInput } from '@/components/ui/text-input';
import { type QuoteItem } from '@/features/requests/types';
import { useStyles } from '@/features/requests/styles/requests.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { currencyInputFromDecimal, formatCurrencyInput } from '@/utils/input-formatters';

export function QuoteItems({ items, disabled, onChange }: {
  items: QuoteItem[]; disabled: boolean; onChange: (items: QuoteItem[]) => void;
}) {
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  const change = (index: number, values: Partial<QuoteItem>) => onChange(items.map((item, position) => position === index ? { ...item, ...values } : item));
  return <View style={{ gap: 16 }}>
    <Txt style={common.caption}>Defina o preço e o prazo de cada idioma. O cliente poderá aprovar todos ou apenas alguns; cada idioma aprovado terá seu próprio trabalho.</Txt>
    {items.map((item, index) => <View key={item.target} style={{ gap: 8 }}>
      <Txt style={styles.sectionTitle}>{item.target}</Txt>
      <View style={[styles.quoteFields, width < 650 && { flexDirection: 'column' }]}>
        <View style={styles.quoteField}>
          <Txt style={styles.label}>Valor · {item.target} (R$)</Txt>
          <TextInput accessibilityLabel={`Valor para ${item.target} (R$)`} value={item.amount}
            onChangeText={value => change(index, { amount: formatCurrencyInput(value) })}
            onBlur={() => change(index, { amount: currencyInputFromDecimal(item.amount) })}
            editable={!disabled} keyboardType="decimal-pad" maxLength={18} style={styles.input} />
        </View>
        <DateSelectField compact={width < 650} label={`Prazo para ${item.target}`} value={item.delivery}
          disabled={disabled} onChange={delivery => change(index, { delivery })} />
      </View>
    </View>)}
  </View>;
}
