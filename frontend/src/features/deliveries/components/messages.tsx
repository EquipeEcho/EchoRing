import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/deliveries/styles/deliveries.styles';
import { useTheme } from '@/theme/theme-context';

export function Messages({ notice, error }: { notice: string; error: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <>
      {!!notice && (
        <View style={styles.notice}>
          <CheckCircle2 size={20} color={colors.green} />
          <Txt
            accessibilityLiveRegion="polite"
            testID="delivery-notice"
            style={{ color: colors.green, flex: 1 }}
          >
            {notice}
          </Txt>
        </View>
      )}
      {!!error && (
        <View style={styles.error}>
          <AlertCircle size={20} color={colors.red} />
          <Txt accessibilityRole="alert" style={{ color: colors.red, flex: 1 }}>
            {error}
          </Txt>
        </View>
      )}
    </>
  );
}
