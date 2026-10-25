import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { dateFromValue, dateKey, formatSelectedDate } from '@/components/ui/fields/date-utils';
import { useStyles } from '@/components/ui/fields/selection-fields.styles';
import { type FieldBaseProps } from '@/components/ui/fields/types';
import { Txt } from '@/components/ui/text';
import { useTheme } from '@/theme/theme-context';

export function DateSelectField({
  label,
  value,
  onChange,
  disabled,
  invalid,
  compact,
  prefix,
}: FieldBaseProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const today = useMemo(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  }, []);
  const selected = dateFromValue(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(
    () => new Date((selected ?? today).getFullYear(), (selected ?? today).getMonth(), 1, 12),
  );
  const cells = useMemo(() => {
    const firstOffset = (month.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstOffset + 1;
      return day > 0 && day <= days
        ? new Date(month.getFullYear(), month.getMonth(), day, 12)
        : null;
    });
  }, [month]);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  const canGoBack = month.getTime() > currentMonth.getTime();
  function showCalendar() {
    const base = selected && selected >= today ? selected : today;
    setMonth(new Date(base.getFullYear(), base.getMonth(), 1, 12));
    setOpen(true);
  }
  function select(date: Date) {
    onChange(dateKey(date));
    setOpen(false);
  }
  const display = value ? formatSelectedDate(value) : 'Selecione no calendário';
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
          accessibilityValue={{ text: value || 'Nenhuma data selecionada' }}
          aria-haspopup="dialog"
          aria-expanded={open}
          accessibilityState={{ disabled: !!disabled, expanded: open }}
          aria-invalid={invalid}
          disabled={disabled}
          onPress={showCalendar}
          style={({ hovered, pressed }) => [
            styles.control,
            invalid && styles.controlInvalid,
            hovered && styles.controlHover,
            pressed && { opacity: 0.78 },
            disabled && { opacity: 0.55 },
          ]}
        >
          <Txt numberOfLines={1} style={[styles.value, !value && styles.placeholder]}>
            {display}
          </Txt>
          <CalendarDays size={18} color={invalid ? colors.red : colors.accent} />
        </Pressable>
      </View>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="compact"
        mobileSheet
        eyebrow="CALENDÁRIO"
        title="Escolha o prazo"
        description="Selecione a data desejada para receber o projeto."
      >
        <View style={styles.calendarHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            disabled={!canGoBack}
            onPress={() =>
              setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12))
            }
            style={[styles.monthButton, !canGoBack && { opacity: 0.3 }]}
          >
            <ChevronLeft size={19} color={colors.ink} />
          </Pressable>
          <Txt style={styles.monthTitle}>
            {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            onPress={() =>
              setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12))
            }
            style={styles.monthButton}
          >
            <ChevronRight size={19} color={colors.ink} />
          </Pressable>
        </View>
        <View style={styles.weekdays}>
          {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day) => (
            <Txt key={day} style={styles.weekday}>
              {day}
            </Txt>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((date, index) => {
            if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
            const key = dateKey(date);
            const isPast = date < today;
            const isSelected = key === value;
            const isToday = key === dateKey(today);
            return (
              <View key={key} style={styles.dayCell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={date.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  accessibilityState={{ disabled: isPast, selected: isSelected }}
                  disabled={isPast}
                  onPress={() => select(date)}
                  style={({ hovered, pressed }) => [
                    styles.day,
                    isToday && styles.dayToday,
                    isSelected && styles.daySelected,
                    isPast && styles.dayDisabled,
                    hovered && !isPast && !isSelected && styles.dayHover,
                    pressed && { opacity: 0.72 },
                  ]}
                >
                  <Txt
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isPast && { color: colors.disabled },
                    ]}
                  >
                    {date.getDate()}
                  </Txt>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={styles.calendarActions}>
          {!!value && (
            <Button
              variant="ghost"
              onPress={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Limpar prazo
            </Button>
          )}
          <Button variant="secondary" onPress={() => select(today)}>
            Selecionar hoje
          </Button>
        </View>
      </Dialog>
    </>
  );
}
