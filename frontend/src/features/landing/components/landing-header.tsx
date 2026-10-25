import { router } from 'expo-router';
import { ArrowUpRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Brand } from '@/components/ui/brand';
import { Txt } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSession } from '@/features/auth/contexts/session-context';
import { useStyles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps, NavigateSection } from '@/features/landing/types';
import { useTheme } from '@/theme/theme-context';

export function LandingHeader({
  layout,
  onNavigate: go,
}: LandingSectionProps & { onNavigate: NavigateSection }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { headerHeight, mobile, narrow } = layout;
  const compact = layout.width < 1000;
  const { session } = useSession();
  return (
    <View testID="landing-header" style={[styles.header, { height: headerHeight }, mobile && styles.headerMobile]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Echo Ring, início"
        onPress={() => go('top')}
        style={styles.companyBrand}
      >
        <Brand compact={compact} />
      </Pressable>
      <View style={[styles.headerLinks, compact && { gap: 10 }]}>
        {!compact && (
          <>
            <Pressable accessibilityRole="button" onPress={() => go('services')} style={styles.navTarget}>
              <Txt style={styles.navLink}>Serviços</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => go('languages')} style={styles.navTarget}>
              <Txt style={styles.navLink}>Idiomas</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => go('process')} style={styles.navTarget}>
              <Txt style={styles.navLink}>Sobre</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => go('quote')} style={styles.navTarget}>
              <Txt style={styles.navLink}>Contato</Txt>
            </Pressable>
          </>
        )}
        <ThemeToggle />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(session ? '/dashboard' : '/login')}
          style={[styles.portal, mobile && styles.portalMobile, narrow && styles.portalNarrow]}
        >
          <Txt style={[styles.portalText, narrow && { fontSize: 12 }]}>
            {narrow ? 'Portal' : mobile ? 'Área da equipe' : 'Entrar no portal'}
          </Txt>
          <ArrowUpRight size={16} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}
