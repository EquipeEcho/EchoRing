import { Plus, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { OptionSelectField } from '@/components/ui/fields/option-select-field';
import { IconButton } from '@/components/ui/icon-button';
import { Txt } from '@/components/ui/text';
import { languageCode, languageMatches, languageOptions } from '@/data/language-options';
import { type QuoteForm } from '@/features/landing/hooks/use-quote-form';
import { requestTargets } from '@/features/requests/utils/quote-scope';
import { useCommonStyles } from '@/theme/common.styles';

export function TargetFields({ form }: { form: QuoteForm }) {
  const targets = requestTargets(form.data);
  const common = useCommonStyles();
  return <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
    {targets.map((target, index) => <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
      <OptionSelectField compact label={index ? `Idioma de destino ${index + 1} *` : 'Idioma de destino *'}
        value={target} onChange={value => form.change('targets', targets.map((item, position) => position === index ? value : item))}
        options={languageOptions.filter(option => !targets.some((item, position) => position !== index && languageCode(item) === languageCode(option)))}
        searchable matchOption={languageMatches} dialogTitle={index ? `Idioma de destino ${index + 1}` : 'Idioma de destino'}
        description="Pesquise o idioma em que deseja receber a tradução." disabled={form.busy} invalid={form.invalid.includes('target')} />
      </View>
      {targets.length > 1 && <IconButton icon={Trash2} label={`Remover destino ${index + 1}`} disabled={form.busy}
        onPress={() => form.change('targets', targets.filter((_, position) => position !== index))} />}
    </View>)}
    <Button variant="secondary" icon={Plus} disabled={form.busy || targets.length >= languageOptions.length - 1}
      onPress={() => form.change('targets', [...targets, ''])}>Adicionar idioma de destino</Button>
    <Txt style={common.caption}>O mesmo material pode ser traduzido para vários idiomas. Você poderá aprovar cada idioma na proposta.</Txt>
  </View>;
}
