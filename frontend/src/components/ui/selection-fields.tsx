import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '@/constants/design';
import { Dialog } from './dialog';
import { Button, Txt } from './primitives';

export const languageOptions = [
  'Português', 'Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano',
  'Mandarim', 'Japonês', 'Coreano', 'Árabe', 'Russo', 'Holandês',
  'Outro / consultar disponibilidade',
];

type FieldBaseProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  compact?: boolean;
  prefix?: string;
};

export function OptionSelectField({
  label, value, onChange, options, placeholder = 'Selecione uma opção', dialogTitle = label.replace(/\s*\*$/, ''),
  description, disabled, invalid, compact, prefix,
}: FieldBaseProps & { options: string[]; placeholder?: string; dialogTitle?: string; description?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <View testID="landing-field" style={[s.field, compact && s.fieldCompact]}>
      <View style={s.fieldHeading}>{prefix && <Txt style={s.prefix}>{prefix}</Txt>}<Txt style={s.label}>{label}</Txt></View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value || placeholder }}
        aria-invalid={invalid}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ hovered, pressed }) => [s.control, invalid && s.controlInvalid, hovered && s.controlHover, pressed && { opacity: 0.78 }, disabled && { opacity: 0.55 }]}
      >
        <Txt numberOfLines={1} style={[s.value, !value && s.placeholder]}>{value || placeholder}</Txt>
        <ChevronDown size={18} color={invalid ? colors.red : colors.muted} />
      </Pressable>
    </View>
    <Dialog open={open} onClose={() => setOpen(false)} size="compact" eyebrow="SELEÇÃO" title={dialogTitle} description={description}>
      <View style={s.optionList}>{options.map(option => {
        const selected = value === option;
        return <Pressable
          key={option}
          accessibilityRole="radio"
          accessibilityLabel={`${dialogTitle}: ${option}`}
          accessibilityState={{ checked: selected }}
          aria-checked={selected}
          onPress={() => { onChange(option); setOpen(false); }}
          style={({ hovered, pressed }) => [s.option, selected && s.optionSelected, hovered && s.optionHover, pressed && { opacity: 0.78 }]}
        >
          <View style={[s.radio, selected && s.radioSelected]}>{selected && <Check size={13} color={colors.canvas} strokeWidth={3} />}</View>
          <Txt style={[s.optionText, selected && { color: colors.ink }]}>{option}</Txt>
        </Pressable>;
      })}</View>
    </Dialog>
  </>;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSelectedDate(value: string) {
  const date = dateFromValue(value);
  return date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : value;
}

export function DateSelectField({ label, value, onChange, disabled, invalid, compact, prefix }: FieldBaseProps) {
  const today = useMemo(() => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12); }, []);
  const selected = dateFromValue(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date((selected ?? today).getFullYear(), (selected ?? today).getMonth(), 1, 12));
  const cells = useMemo(() => {
    const firstOffset = (month.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstOffset + 1;
      return day > 0 && day <= days ? new Date(month.getFullYear(), month.getMonth(), day, 12) : null;
    });
  }, [month]);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  const canGoBack = month.getTime() > currentMonth.getTime();
  function showCalendar() {
    const base = selected && selected >= today ? selected : today;
    setMonth(new Date(base.getFullYear(), base.getMonth(), 1, 12));
    setOpen(true);
  }
  function select(date: Date) { onChange(dateKey(date)); setOpen(false); }
  const display = value ? formatSelectedDate(value) : 'Selecione no calendário';
  return <>
    <View testID="landing-field" style={[s.field, compact && s.fieldCompact]}>
      <View style={s.fieldHeading}>{prefix && <Txt style={s.prefix}>{prefix}</Txt>}<Txt style={s.label}>{label}</Txt></View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value || 'Nenhuma data selecionada' }}
        aria-invalid={invalid}
        disabled={disabled}
        onPress={showCalendar}
        style={({ hovered, pressed }) => [s.control, invalid && s.controlInvalid, hovered && s.controlHover, pressed && { opacity: 0.78 }, disabled && { opacity: 0.55 }]}
      >
        <Txt numberOfLines={1} style={[s.value, !value && s.placeholder]}>{display}</Txt>
        <CalendarDays size={18} color={invalid ? colors.red : colors.accent} />
      </Pressable>
    </View>
    <Dialog open={open} onClose={() => setOpen(false)} size="compact" eyebrow="CALENDÁRIO" title="Escolha o prazo" description="Selecione a data desejada para receber o projeto.">
      <View style={s.calendarHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" disabled={!canGoBack} onPress={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12))} style={[s.monthButton, !canGoBack && { opacity: 0.3 }]}><ChevronLeft size={19} color={colors.ink} /></Pressable>
        <Txt style={s.monthTitle}>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12))} style={s.monthButton}><ChevronRight size={19} color={colors.ink} /></Pressable>
      </View>
      <View style={s.weekdays}>{['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(day => <Txt key={day} style={s.weekday}>{day}</Txt>)}</View>
      <View style={s.calendarGrid}>{cells.map((date, index) => {
        if (!date) return <View key={`empty-${index}`} style={s.dayCell} />;
        const key = dateKey(date);
        const isPast = date < today;
        const isSelected = key === value;
        const isToday = key === dateKey(today);
        return <View key={key} style={s.dayCell}><Pressable
          accessibilityRole="button"
          accessibilityLabel={date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          accessibilityState={{ disabled: isPast, selected: isSelected }}
          disabled={isPast}
          onPress={() => select(date)}
          style={({ hovered, pressed }) => [s.day, isToday && s.dayToday, isSelected && s.daySelected, isPast && s.dayDisabled, hovered && !isPast && !isSelected && s.dayHover, pressed && { opacity: 0.72 }]}
        ><Txt style={[s.dayText, isSelected && s.dayTextSelected, isPast && { color: '#55545A' }]}>{date.getDate()}</Txt></Pressable></View>;
      })}</View>
      <View style={s.calendarActions}>{!!value && <Button variant="ghost" onPress={() => { onChange(''); setOpen(false); }}>Limpar prazo</Button>}<Button variant="secondary" onPress={() => select(today)}>Selecionar hoje</Button></View>
    </Dialog>
  </>;
}

const s = StyleSheet.create({
  field: { flex: 1, minWidth: 0, gap: 8, marginBottom: 18 }, fieldCompact: { flex: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  fieldHeading: { minHeight: 19, flexDirection: 'row', alignItems: 'center', gap: 9 }, prefix: { fontSize: 9, lineHeight: 15, letterSpacing: 1.3, color: colors.accent, fontWeight: '600' }, label: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  control: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, borderRadius: 12, backgroundColor: '#1B1B1E', borderWidth: 1, borderColor: '#353539' }, controlHover: { borderColor: '#74505E', backgroundColor: '#201D20' }, controlInvalid: { borderColor: colors.red },
  value: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 22 }, placeholder: { color: colors.muted },
  optionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, option: { width: '48%', minHeight: 50, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.canvas }, optionSelected: { borderColor: '#85405A', backgroundColor: colors.accentSoft }, optionHover: { borderColor: '#704354', backgroundColor: '#1B1518' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#5C5A62', alignItems: 'center', justifyContent: 'center' }, radioSelected: { backgroundColor: colors.accent, borderColor: colors.accent }, optionText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.muted },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, monthButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }, monthTitle: { textTransform: 'capitalize', fontSize: 16, lineHeight: 23, fontWeight: '600' },
  weekdays: { flexDirection: 'row' }, weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 9, lineHeight: 16, letterSpacing: 1, color: colors.muted, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }, dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }, day: { width: 36, height: 36, maxWidth: '88%', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, dayToday: { borderWidth: 1, borderColor: '#76505D' }, daySelected: { backgroundColor: colors.accent }, dayDisabled: { opacity: 0.52 }, dayHover: { backgroundColor: colors.accentSoft }, dayText: { fontSize: 13, color: colors.ink }, dayTextSelected: { color: colors.canvas, fontWeight: '700' },
  calendarActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, paddingTop: 4 },
});
