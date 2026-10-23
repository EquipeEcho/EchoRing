import { Plus, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { OptionSelectField } from '@/components/ui/fields/option-select-field';
import { IconButton } from '@/components/ui/icon-button';
import { Txt } from '@/components/ui/text';
import { languageCode, languageMatches, languageOptions } from '@/data/language-options';
import { languageLevels } from '@/features/translators/constants';
import { useStyles } from '@/features/translators/styles/onboarding.styles';
import { type LanguageLevel, type ProfileErrors, type TranslatorProfile } from '@/features/translators/types';

export function ProfileLanguages({ data, change, disabled, errors }: {
  data: TranslatorProfile; change: <Key extends keyof TranslatorProfile>(key: Key, value: TranslatorProfile[Key]) => void;
  disabled: boolean; errors: ProfileErrors;
}) {
  const styles = useStyles();
  const codes = data.languages.map(language => languageCode(language.name)).filter(Boolean);
  return (
    <View style={styles.section}>
      <Txt style={styles.sectionLabel}>Idiomas que você domina *</Txt>
      <Txt style={styles.note}>Inclua seu idioma nativo e os idiomas com os quais trabalha. Você poderá receber oportunidades entre eles, nos dois sentidos. Adicione até 30 idiomas.</Txt>
      {data.languages.map((language, index) => <View key={index} style={styles.item}>
        <View style={styles.itemHeader}>
          <Txt style={styles.itemTitle}>IDIOMA {index + 1}</Txt>
          <IconButton icon={Trash2} label={`Remover idioma ${index + 1}`} disabled={disabled} onPress={() => {
            if (disabled) return;
            change('languages', data.languages.filter((_, item) => item !== index));
          }} />
        </View>
        <OptionSelectField compact label={`Idioma ${index + 1}`} value={language.name} placeholder="Selecione um idioma" disabled={disabled}
          options={languageOptions.filter(name => languageCode(name) === languageCode(language.name) || !codes.includes(languageCode(name)))} matchOption={languageMatches}
          searchable description="Busque pelo nome ou código do idioma. A lista inclui variantes regionais e LIBRAS."
          onChange={name => {
            change('languages', data.languages.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item));
          }} />
        <OptionSelectField compact label={`Nível do idioma ${index + 1}`} value={language.level} disabled={disabled}
          options={languageLevels} dialogTitle={`Nível do idioma ${index + 1}`}
          onChange={level => change('languages', data.languages.map((item, itemIndex) => itemIndex === index ? { ...item, level: level as LanguageLevel } : item))} />
      </View>)}
      <Button variant="secondary" icon={Plus} disabled={disabled || data.languages.length >= 30}
        onPress={() => change('languages', [...data.languages, { name: '', level: data.languages.length ? 'Fluente' : 'Nativo' }])}>Adicionar idioma</Button>
      {!!errors.languages && <Txt accessibilityRole="alert" style={styles.error}>{errors.languages}</Txt>}
    </View>
  );
}
