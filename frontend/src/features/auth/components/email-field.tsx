import { TextInput, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/auth/styles/auth.styles';
import { useTheme } from '@/theme/theme-context';

export function EmailField({
  value,
  onChange,
  error,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onSubmit?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Txt style={styles.label}>E-mail</Txt>
      <View testID="auth-input" style={[styles.inputWrap, !!error && styles.invalid]}>
        <TextInput
          accessibilityLabel="E-mail"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="seu@email.com"
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          style={styles.input}
        />
      </View>
      {!!error && (
        <Txt accessibilityRole="alert" style={styles.error}>
          {error}
        </Txt>
      )}
    </View>
  );
}
