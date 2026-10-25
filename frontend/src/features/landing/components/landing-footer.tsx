import { Pressable, View } from 'react-native';

import { Brand } from '@/components/ui/brand';
import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps, NavigateSection } from '@/features/landing/types';
import { useTheme } from '@/theme/theme-context';

export function LandingFooter({
  layout,
  onNavigate: go,
}: LandingSectionProps & { onNavigate: NavigateSection }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { mobile } = layout;
  return (
    <View style={[styles.footer, mobile && styles.footerMobile]}>
      <Brand />
      <View style={styles.footerLinks}>
        <Pressable accessibilityRole="button" onPress={() => go('services')} style={styles.navTarget}>
          <Txt style={styles.footerLink}>Serviços</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => go('languages')} style={styles.navTarget}>
          <Txt style={styles.footerLink}>Idiomas</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => go('process')} style={styles.navTarget}>
          <Txt style={styles.footerLink}>Sobre</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => go('quote')} style={styles.navTarget}>
          <Txt style={styles.footerLink}>Contato</Txt>
        </Pressable>
      </View>
      <Txt style={{ fontSize: 12, color: colors.muted }}>
        © {new Date().getFullYear()} Echo Ring
      </Txt>
    </View>
  );
}
