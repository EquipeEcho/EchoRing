import { Plus, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { OptionSelectField } from '@/components/ui/fields/option-select-field';
import { IconButton } from '@/components/ui/icon-button';
import { Txt } from '@/components/ui/text';
import { ProfileField } from '@/features/translators/components/profile-field';
import { languageLevels } from '@/features/translators/constants';
import { useStyles } from '@/features/translators/styles/onboarding.styles';
import { type LanguageLevel, type ProfileErrors, type TranslatorProfile } from '@/features/translators/types';

export function ProfileLanguages({ data, change, disabled, errors }: {
  data: TranslatorProfile; change: <Key extends keyof TranslatorProfile>(key: Key, value: TranslatorProfile[Key]) => void;
  disabled: boolean; errors: ProfileErrors;
}) {
  const styles = useStyles();
  const names = data.languages.map(language => language.name.trim()).filter(Boolean);
  return (
    <View style={styles.section}>
      <Txt style={styles.sectionLabel}>Idiomas que você domina *</Txt>
      <Txt style={styles.note}>Inclua seu idioma nativo e os idiomas com os quais trabalha. Você pode adicionar até 30.</Txt>
      {data.languages.map((language, index) => <View key={index} style={styles.item}>
        <View style={styles.itemHeader}>
          <Txt style={styles.itemTitle}>IDIOMA {index + 1}</Txt>
          <IconButton icon={Trash2} label={`Remover idioma ${index + 1}`} disabled={disabled} onPress={() => {
            if (disabled) return;
            change('languages', data.languages.filter((_, item) => item !== index));
            change('translationPairs', data.translationPairs.filter(pair => pair.source !== language.name.trim() && pair.target !== language.name.trim()));
          }} />
        </View>
        <ProfileField label={`Idioma ${index + 1}`} value={language.name} placeholder="Ex.: Português, Inglês, Latim..." disabled={disabled} maxLength={80}
          onChange={name => {
            const previous = language.name.trim();
            change('languages', data.languages.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item));
            if (previous) change('translationPairs', data.translationPairs.map(pair => ({
              source: pair.source === previous ? name.trim() : pair.source,
              target: pair.target === previous ? name.trim() : pair.target,
            })));
          }} />
        <OptionSelectField compact label={`Nível do idioma ${index + 1}`} value={language.level} disabled={disabled}
          options={languageLevels} dialogTitle={`Nível do idioma ${index + 1}`}
          onChange={level => change('languages', data.languages.map((item, itemIndex) => itemIndex === index ? { ...item, level: level as LanguageLevel } : item))} />
      </View>)}
      <Button variant="secondary" icon={Plus} disabled={disabled || data.languages.length >= 30}
        onPress={() => change('languages', [...data.languages, { name: '', level: data.languages.length ? 'Fluente' : 'Nativo' }])}>Adicionar idioma</Button>
      {!!errors.languages && <Txt accessibilityRole="alert" style={styles.error}>{errors.languages}</Txt>}
      <View style={styles.review}>
        <Txt style={styles.sectionLabel}>Pares de tradução *</Txt>
        <Txt style={styles.note}>Informe em quais direções você traduz. Inglês → Português e Português → Inglês são pares diferentes.</Txt>
        {data.translationPairs.map((pair, index) => <View key={index} style={styles.item}>
          <View style={styles.itemHeader}>
            <Txt style={styles.itemTitle}>PAR {index + 1}</Txt>
            <IconButton icon={Trash2} label={`Remover par ${index + 1}`} disabled={disabled} onPress={() => { if (!disabled) change('translationPairs', data.translationPairs.filter((_, item) => item !== index)); }} />
          </View>
          <OptionSelectField compact label={`Origem do par ${index + 1}`} value={pair.source} options={[...new Set(names)]} dialogTitle={`Origem do par ${index + 1}`} disabled={disabled}
            onChange={source => change('translationPairs', data.translationPairs.map((item, itemIndex) => itemIndex === index ? { ...item, source } : item))} />
          <OptionSelectField compact label={`Destino do par ${index + 1}`} value={pair.target} options={[...new Set(names)].filter(name => name !== pair.source)} dialogTitle={`Destino do par ${index + 1}`} disabled={disabled}
            onChange={target => change('translationPairs', data.translationPairs.map((item, itemIndex) => itemIndex === index ? { ...item, target } : item))} />
        </View>)}
        <Button variant="secondary" icon={Plus} disabled={disabled || names.length < 2 || data.translationPairs.length >= 60}
          onPress={() => change('translationPairs', [...data.translationPairs, { source: '', target: '' }])}>Adicionar par de tradução</Button>
        {!!errors.translationPairs && <Txt accessibilityRole="alert" style={styles.error}>{errors.translationPairs}</Txt>}
      </View>
    </View>
  );
}
