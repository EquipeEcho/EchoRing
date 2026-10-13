import { ArrowDown, ArrowUpRight } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps, NavigateSection } from '@/features/landing/types';
import { useTheme } from '@/theme/theme-context';

export function HeroSection({
  layout,
  onLayout,
  onNavigate: go,
}: LandingSectionProps & { onNavigate: NavigateSection }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { mobile, short, heroHeight, pageGutter, heroType } = layout;
  return (
    <View
      testID="landing-hero-globe"
      onLayout={onLayout}
      style={[
        styles.hero,
        { height: heroHeight, marginHorizontal: -pageGutter },
        mobile && styles.heroMobile,
        short && mobile && styles.heroShort,
      ]}
    >
      <Image
        source={require('@/assets/images/landing/hero-globe.png')}
        resizeMode="cover"
        style={[styles.heroImage, mobile && styles.heroImageMobile]}
      />
      <View pointerEvents="none" style={[styles.heroShade, mobile && styles.heroShadeMobile]} />
      <View style={[styles.heroCopy, mobile && { maxWidth: '100%' }]}>
        <View
          style={[
            styles.heroTag,
            mobile && styles.heroTagMobile,
            short && mobile && styles.heroTagShort,
          ]}
        >
          <Txt style={[styles.heroTagText, mobile && styles.heroTagTextMobile]}>TRADUÇÕES QUE</Txt>
        </View>
        <Txt accessibilityRole="header" style={[styles.heroTitle, heroType]}>
          Conectam{`\n`}
          <Txt style={[styles.heroTitle, { color: colors.accent }, heroType]}>o mundo.</Txt>
        </Txt>
        <Txt
          style={[
            styles.heroDescription,
            mobile && styles.heroDescriptionMobile,
            short && mobile && styles.heroDescriptionShort,
          ]}
        >
          Mais que palavras, conexões entre pessoas, culturas e oportunidades.
        </Txt>
        <View
          style={[
            styles.heroActions,
            mobile && styles.heroActionsMobile,
            short && mobile && styles.heroActionsShort,
          ]}
        >
          <Button
            style={mobile && styles.heroButtonMobile}
            icon={ArrowUpRight}
            onPress={() => go('quote')}
          >
            Solicitar orçamento
          </Button>
          <Pressable
            accessibilityRole="button"
            onPress={() => go('services')}
            style={[
              styles.discover,
              mobile && styles.discoverMobile,
              short && mobile && styles.discoverShort,
            ]}
          >
            <Txt style={{ color: colors.muted, fontSize: mobile ? 14 : 15 }}>
              Conheça nossas soluções
            </Txt>
            <ArrowDown size={17} color={colors.muted} />
          </Pressable>
        </View>
        <View
          style={[
            styles.heroKeywords,
            mobile && styles.heroKeywordsMobile,
            short && mobile && styles.heroKeywordsShort,
          ]}
        >
          <Txt style={styles.heroKeyword}>IDIOMAS</Txt>
          <View style={styles.keywordRule} />
          <Txt style={styles.heroKeyword}>PESSOAS</Txt>
          <View style={styles.keywordRule} />
          <Txt style={styles.heroKeyword}>NOVAS POSSIBILIDADES</Txt>
        </View>
      </View>
    </View>
  );
}
