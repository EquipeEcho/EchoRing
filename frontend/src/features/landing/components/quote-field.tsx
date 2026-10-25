import { View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/landing/styles/landing.styles';
import { type IntakeTextField } from '@/features/requests/types';
import { useTheme } from '@/theme/theme-context';

export function QuoteField({
  width,
  fieldKey: key,
  label,
  placeholder,
  value,
  onChangeText,
  invalid,
  disabled,
  errorMessage,
  registerInput,
  multiline = false,
}: {
  width: number;
  fieldKey: IntakeTextField;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  errorMessage?: string;
  registerInput?: (key: IntakeTextField, input: TextInput | null) => void;
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View
      testID="landing-field"
      style={[styles.field, width < 600 && { flex: 0, flexShrink: 0, flexBasis: 'auto' }]}
    >
      <Txt style={styles.label}>{label}</Txt>
      <TextInput
        ref={(element) => registerInput?.(key, element)}
        accessibilityLabel={label}
        aria-invalid={invalid}
        editable={!disabled}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          multiline && styles.textarea,
          invalid && { borderColor: colors.red },
        ]}
        multiline={multiline}
        autoCapitalize={key === 'email' ? 'none' : 'sentences'}
        keyboardType={key === 'email' ? 'email-address' : 'default'}
        autoComplete={key === 'email' ? 'email' : key === 'name' ? 'name' : 'off'}
        maxLength={multiline ? 3000 : 160}
      />
      {errorMessage && (
        <Txt accessibilityRole="alert" style={{ color: colors.red, fontSize: 12, lineHeight: 17 }}>
          {errorMessage}
        </Txt>
      )}
    </View>
  );
}
