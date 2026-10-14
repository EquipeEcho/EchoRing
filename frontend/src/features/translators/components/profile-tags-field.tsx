import { Check, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { Txt } from '@/components/ui/text';
import { ProfileField } from '@/features/translators/components/profile-field';
import { useStyles } from '@/features/translators/styles/onboarding.styles';
import { useTheme } from '@/theme/theme-context';

export function ProfileTagsField({ label, values, onChange, options = [], placeholder, disabled, error, limit = 20, links = false }: {
  label: string; values: string[]; onChange: (values: string[]) => void; options?: string[];
  placeholder?: string; disabled?: boolean; error?: string; limit?: number; links?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const includes = (value: string) => values.some(item => item.toLocaleLowerCase() === value.toLocaleLowerCase());
  function add() {
    if (disabled || values.length >= limit) return;
    const value = input.trim();
    if (!value) return;
    if (links) {
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || /\s/.test(value)) throw new Error();
      } catch {
        setInputError('Informe um link completo, começando com https:// ou http://.');
        return;
      }
    }
    if (!includes(value) && values.length < limit) onChange([...values, value]);
    setInput('');
    setInputError('');
  }
  function toggle(value: string) {
    if (includes(value)) onChange(values.filter(item => item.toLocaleLowerCase() !== value.toLocaleLowerCase()));
    else if (values.length < limit) onChange([...values, value]);
  }
  return (
    <View style={styles.section}>
      <Txt style={styles.label}>{label}</Txt>
      {!!options.length && <View style={styles.chips}>
        {options.map(option => <Pressable
          key={option} accessibilityRole="checkbox" accessibilityLabel={option}
          accessibilityState={{ checked: includes(option), disabled }} aria-checked={includes(option)}
          disabled={disabled || (!includes(option) && values.length >= limit)} onPress={() => toggle(option)}
          style={[styles.chip, includes(option) && styles.chipSelected]}
        >
          {includes(option) && <Check size={14} color={colors.accent} />}
          <Txt style={[styles.chipText, includes(option) && { color: colors.accent }]}>{option}</Txt>
        </Pressable>)}
      </View>}
      {!!values.length && <View style={styles.chips}>
        {values.filter(value => !options.some(option => option.toLocaleLowerCase() === value.toLocaleLowerCase())).map(value => <Pressable
          key={value} accessibilityRole="button" accessibilityLabel={`Remover ${value}`}
          disabled={disabled} onPress={() => toggle(value)} style={[styles.chip, styles.chipSelected]}
        >
          <Txt style={[styles.chipText, { color: colors.accent }]}>{value}</Txt>
          <X size={14} color={colors.accent} />
        </Pressable>)}
      </View>}
      <View style={styles.tagInput}>
        <ProfileField label={links ? 'Link do portfólio' : `Adicionar em ${label.replace(' *', '').toLocaleLowerCase()}`}
          value={input} onChange={value => { setInput(value); setInputError(''); }} placeholder={placeholder}
          disabled={disabled || values.length >= limit} onSubmit={add} maxLength={links ? 500 : 80} keyboardType={links ? 'url' : 'default'} />
        <IconButton icon={Plus} label={`Adicionar em ${label.replace(' *', '').toLocaleLowerCase()}`} disabled={disabled || values.length >= limit} onPress={add} />
      </View>
      <Txt style={styles.note}>{values.length} de {limit} itens. {links ? 'Links públicos dos seus trabalhos ou perfil profissional.' : 'Você também pode adicionar outros itens.'}</Txt>
      {!!(error || inputError) && <Txt accessibilityRole="alert" style={styles.error}>{inputError || error}</Txt>}
    </View>
  );
}
