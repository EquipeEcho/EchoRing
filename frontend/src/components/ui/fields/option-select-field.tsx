import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Dialog } from '@/components/ui/dialog';
import { styles } from '@/components/ui/fields/selection-fields.styles';
import { type FieldBaseProps } from '@/components/ui/fields/types';
import { Txt } from '@/components/ui/text';
import { colors } from '@/theme/tokens';

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
}: FieldBaseProps & {
  options: string[];
  placeholder?: string;
  dialogTitle?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
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
          onPress={() => setOpen(true)}
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
        <View style={styles.optionList}>
          {options.map((option) => {
            const selected = value === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={`${dialogTitle}: ${option}`}
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                onPress={() => {
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
                  {selected && <Check size={13} color={colors.canvas} strokeWidth={3} />}
                </View>
                <Txt style={[styles.optionText, selected && { color: colors.ink }]}>{option}</Txt>
              </Pressable>
            );
          })}
        </View>
      </Dialog>
    </>
  );
}
