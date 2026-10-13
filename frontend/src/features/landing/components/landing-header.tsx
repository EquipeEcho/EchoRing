import { router } from 'expo-router';
import { ArrowUpRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Brand } from '@/components/ui/brand';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { styles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps, NavigateSection } from '@/features/landing/types';
import { colors } from '@/theme/tokens';

export function LandingHeader({
  layout,
  onNavigate: go,
}: LandingSectionProps & { onNavigate: NavigateSection }) {
  const { headerHeight, mobile, narrow } = layout;
  const { session } = useSession();
  return (
    <View style={[styles.header, { height: headerHeight }, mobile && styles.headerMobile]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Echo Ring, início"
        onPress={() => go('top')}
        style={styles.companyBrand}
      >
        <Brand compact={mobile} />
      </Pressable>
      <View style={styles.headerLinks}>
        {!mobile && (
          <>
            <Pressable accessibilityRole="button" onPress={() => go('services')}>
              <Txt style={styles.navLink}>Serviços</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => go('languages')}>
              <Txt style={styles.navLink}>Idiomas</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => go('process')}>
              <Txt style={styles.navLink}>Sobre</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => go('quote')}>
              <Txt style={styles.navLink}>Contato</Txt>
            </Pressable>
          </>
        )}
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
