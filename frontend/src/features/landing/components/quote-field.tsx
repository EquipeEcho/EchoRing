import { View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';

import { Txt } from '@/components/ui/text';
import type { QuoteForm } from '@/features/landing/hooks/use-quote-form';
import { useStyles } from '@/features/landing/styles/landing.styles';
import { useTheme } from '@/theme/theme-context';

export function QuoteField({
  form,
  width,
  fieldKey: key,
  label,
  placeholder,
  multiline = false,
}: {
  form: QuoteForm;
  width: number;
  fieldKey: 'name' | 'email' | 'company' | 'title' | 'message';
  label: string;
  placeholder: string;
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { registerInput, invalid, busy, data, change } = form;
  return (
    <View
      testID="landing-field"
      style={[styles.field, width < 600 && { flex: 0, flexShrink: 0, flexBasis: 'auto' }]}
    >
      <Txt style={styles.label}>{label}</Txt>
      <TextInput
        ref={(element) => registerInput(key, element)}
        accessibilityLabel={label}
        aria-invalid={invalid.includes(key)}
        editable={!busy}
        value={data[key]}
        onChangeText={(value) => change(key, value)}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          multiline && styles.textarea,
          invalid.includes(key) && { borderColor: colors.red },
        ]}
        multiline={multiline}
        autoCapitalize={key === 'email' ? 'none' : 'sentences'}
        keyboardType={key === 'email' ? 'email-address' : 'default'}
        autoComplete={key === 'email' ? 'email' : key === 'name' ? 'name' : 'off'}
        maxLength={multiline ? 3000 : 160}
      />
    </View>
  );
}
