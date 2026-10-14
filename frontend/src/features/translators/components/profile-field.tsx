import { TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/translators/styles/onboarding.styles';
import { useTheme } from '@/theme/theme-context';

export function ProfileField({
  label, value, onChange, placeholder, multiline = false, error, hint, disabled = false,
  readOnly = false, keyboardType = 'default', maxLength = 160,
  onSubmit,
}: {
  label: string; value: string; onChange?: (value: string) => void; placeholder?: string;
  multiline?: boolean; error?: string; hint?: string; disabled?: boolean;
  readOnly?: boolean; keyboardType?: KeyboardTypeOptions; maxLength?: number;
  onSubmit?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Txt style={styles.label}>{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        aria-invalid={!!error}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        editable={!disabled && !readOnly}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'url' || keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={keyboardType !== 'url' && keyboardType !== 'email-address'}
        maxLength={maxLength}
        style={[styles.input, multiline && styles.textarea, readOnly && styles.readonly, !!error && styles.inputInvalid]}
      />
      {!!hint && <Txt style={styles.note}>{hint}</Txt>}
      {!!error && <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt>}
    </View>
  );
}
