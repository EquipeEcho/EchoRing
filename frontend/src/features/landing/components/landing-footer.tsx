import { Pressable, View } from 'react-native';

import { Brand } from '@/components/ui/brand';
import { Txt } from '@/components/ui/text';
import { styles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps, NavigateSection } from '@/features/landing/types';
import { colors } from '@/theme/tokens';

export function LandingFooter({
  layout,
  onNavigate: go,
}: LandingSectionProps & { onNavigate: NavigateSection }) {
  const { mobile } = layout;
  return (
    <View style={[styles.footer, mobile && styles.footerMobile]}>
      <Brand />
      <View style={styles.footerLinks}>
        <Pressable onPress={() => go('services')}>
          <Txt style={styles.footerLink}>Serviços</Txt>
        </Pressable>
        <Pressable onPress={() => go('languages')}>
          <Txt style={styles.footerLink}>Idiomas</Txt>
        </Pressable>
        <Pressable onPress={() => go('process')}>
          <Txt style={styles.footerLink}>Sobre</Txt>
        </Pressable>
        <Pressable onPress={() => go('quote')}>
          <Txt style={styles.footerLink}>Contato</Txt>
        </Pressable>
      </View>
      <Txt style={{ fontSize: 12, color: colors.muted }}>
        © {new Date().getFullYear()} Echo Ring
      </Txt>
    </View>
  );
}
