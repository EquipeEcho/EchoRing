import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, type StyleProp, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { Dialog } from '@/components/ui/dialog';
import { useStyles } from '@/components/ui/fields/selection-fields.styles';
import { Txt } from '@/components/ui/text';
import { useTheme } from '@/theme/theme-context';
import { breakpoints } from '@/theme/tokens';

export type FilterOption<T extends string> = { value: T; label: string; count?: number };

const withCount = (option: FilterOption<string>) =>
  option.count === undefined ? option.label : `${option.label} (${option.count})`;

/** Compact single-choice dropdown for toolbars; the selected option and counts show on the trigger. */
export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  style,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value) ?? options[0];
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${withCount(selected)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ hovered, pressed }) => [styles.control, hovered && styles.controlHover, pressed && { opacity: 0.78 }, style]}
      >
        <Txt numberOfLines={1} style={styles.value}>{withCount(selected)}</Txt>
        <ChevronDown size={18} color={colors.muted} />
      </Pressable>
      <Dialog open={open} onClose={() => setOpen(false)} size="compact" mobileSheet eyebrow="FILTRO" title={label}>
        <View style={styles.optionList}>
          {options.map(option => {
            const checked = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={`${label}: ${withCount(option)}`}
                accessibilityState={{ checked }}
                aria-checked={checked}
                onPress={() => { onChange(option.value); setOpen(false); }}
                style={({ hovered, pressed }) => [
                  styles.option,
                  width < breakpoints.phone && styles.optionMobile,
                  checked && styles.optionSelected,
                  hovered && styles.optionHover,
                  pressed && { opacity: 0.78 },
                ]}
              >
                <View style={[styles.radio, checked && styles.radioSelected]}>
                  {checked && <Check size={13} color={colors.onAccent} strokeWidth={3} />}
                </View>
                <Txt style={[styles.optionText, checked && { color: colors.ink }]}>{withCount(option)}</Txt>
              </Pressable>
            );
          })}
        </View>
      </Dialog>
    </>
  );
}
