import { Eye, EyeOff } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/users/styles/users.styles';
import { useTheme } from '@/theme/theme-context';

export function UserField({
  label,
  value,
  onChange,
  placeholder,
  secure,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  secure?: boolean;
  visible?: boolean;
  onToggle?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Txt style={styles.label}>{label}</Txt>
      <View style={styles.inputWrap}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize={label === 'E-mail' ? 'none' : 'words'}
          autoCorrect={false}
          keyboardType={label === 'E-mail' ? 'email-address' : 'default'}
          secureTextEntry={secure && !visible}
          style={styles.input}
        />
        {secure && onToggle && (
          <IconButton
            icon={visible ? EyeOff : Eye}
            label={visible ? 'Ocultar senha inicial' : 'Mostrar senha inicial'}
            onPress={onToggle}
          />
        )}
      </View>
    </View>
  );
}
