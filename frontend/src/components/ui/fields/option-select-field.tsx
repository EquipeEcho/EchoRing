import { Check, ChevronDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Dialog } from '@/components/ui/dialog';
import { useStyles } from '@/components/ui/fields/selection-fields.styles';
import { type FieldBaseProps } from '@/components/ui/fields/types';
import { Txt } from '@/components/ui/text';
import { TextInput } from '@/components/ui/text-input';
import { normalizeLanguageSearch } from '@/data/language-options';
import { useTheme } from '@/theme/theme-context';

export function OptionSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção',
  dialogTitle = label.replace(/\s*\*$/, ''),
  description,
  disabled,
  invalid,
  compact,
  prefix,
  searchable = options.length > 12,
  matchOption,
}: FieldBaseProps & {
  options: string[];
  placeholder?: string;
  dialogTitle?: string;
  description?: string;
  searchable?: boolean;
  matchOption?: (option: string, query: string) => boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(40);
  const matches = useMemo(() => options.filter(option => !query.trim() || (matchOption
    ? matchOption(option, query) : normalizeLanguageSearch(option).includes(normalizeLanguageSearch(query.trim())))), [options, query, matchOption]);
  const visible = matches.slice(0, limit);
  return (
    <>
      <View testID="landing-field" style={[styles.field, compact && styles.fieldCompact]}>
        <View style={styles.fieldHeading}>
          {prefix && <Txt style={styles.prefix}>{prefix}</Txt>}
          <Txt style={styles.label}>{label}</Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text: value || placeholder }}
          aria-invalid={invalid}
          disabled={disabled}
          onPress={() => { setQuery(''); setLimit(40); setOpen(true); }}
          style={({ hovered, pressed }) => [
            styles.control,
            invalid && styles.controlInvalid,
            hovered && styles.controlHover,
            pressed && { opacity: 0.78 },
            disabled && { opacity: 0.55 },
          ]}
        >
          <Txt numberOfLines={1} style={[styles.value, !value && styles.placeholder]}>
            {value || placeholder}
          </Txt>
          <ChevronDown size={18} color={invalid ? colors.red : colors.muted} />
        </Pressable>
      </View>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="compact"
        mobileSheet
        eyebrow="SELEÇÃO"
        title={dialogTitle}
        description={description}
      >
        {searchable && <>
          <TextInput accessibilityLabel={`Buscar em ${dialogTitle}`} value={query} onChangeText={text => { setQuery(text); setLimit(40); }}
            placeholder="Buscar por nome ou código..." placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false}
            style={[styles.search, { color: colors.ink, borderColor: colors.controlLine }]} />
          <Txt style={styles.placeholder} accessibilityLiveRegion="polite">{matches.length} opções{matches.length > visible.length ? ` · exibindo ${visible.length}. Refine sua busca.` : ''}</Txt>
        </>}
        <View style={styles.optionList}>
          {visible.map((option) => {
            const selected = value === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={`${dialogTitle}: ${option}`}
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                disabled={disabled}
                onPress={() => {
                  if (disabled) return;
                  onChange(option);
                  setOpen(false);
                }}
                style={({ hovered, pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  hovered && styles.optionHover,
                  pressed && { opacity: 0.78 },
                ]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <Check size={13} color={colors.onAccent} strokeWidth={3} />}
                </View>
                <Txt style={[styles.optionText, selected && { color: colors.ink }]}>{option}</Txt>
              </Pressable>
            );
          })}
        </View>
        {!matches.length && <Txt style={styles.placeholder}>Nenhuma opção encontrada. Tente outro nome ou código.</Txt>}
        {matches.length > limit && <Pressable accessibilityRole="button" accessibilityLabel="Mostrar mais opções" onPress={() => setLimit(current => current + 40)} style={styles.option}><Txt>Mostrar mais opções</Txt></Pressable>}
      </Dialog>
    </>
  );
}
