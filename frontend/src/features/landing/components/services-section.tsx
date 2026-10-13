import { ArrowRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { landingServices } from '@/features/landing/constants';
import { styles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps } from '@/features/landing/types';
import { colors } from '@/theme/tokens';

export function ServicesSection({
  layout,
  onLayout,
  onSelectService,
}: LandingSectionProps & { onSelectService: (service: string) => void }) {
  const { mobile, narrow, wide } = layout;
  return (
    <View
      testID="landing-services"
      onLayout={onLayout}
      style={[styles.section, mobile && styles.sectionMobile]}
    >
      <Txt style={styles.eyebrow}>NOSSOS SERVIÇOS</Txt>
      <View
        style={[
          styles.sectionHeading,
          mobile && { flexDirection: 'column', alignItems: 'flex-start' },
        ]}
      >
        <Txt
          accessibilityRole="header"
          style={[
            styles.sectionTitle,
            mobile && styles.sectionTitleSmall,
            narrow && styles.sectionTitleNarrow,
          ]}
        >
          Soluções para{`\n`}
          <Txt
            style={[
              styles.sectionTitle,
              mobile && styles.sectionTitleSmall,
              narrow && styles.sectionTitleNarrow,
              { color: colors.accent },
            ]}
          >
            cada necessidade.
          </Txt>
        </Txt>
        <Txt style={[styles.sectionDescription, mobile && styles.sectionDescriptionMobile]}>
          Traduções profissionais para diferentes contextos, sempre preservando o significado da sua
          mensagem.
        </Txt>
      </View>
      <View
        style={[
          styles.services,
          !wide && { flexWrap: 'wrap' },
          mobile && { flexDirection: 'column' },
        ]}
      >
        {landingServices.map((service, index) => (
          <Pressable
            key={service.title}
            accessibilityRole="button"
            accessibilityLabel={`Solicitar ${service.title}`}
            onPress={() => onSelectService(service.title)}
            style={({ hovered, pressed }) => [
              styles.service,
              hovered && styles.serviceHover,
              pressed && { transform: [{ scale: 0.985 }] },
              !wide && { minWidth: mobile ? 0 : 280 },
              mobile && { padding: 24, flex: 0, flexShrink: 0, flexBasis: 'auto' },
            ]}
          >
            <View pointerEvents="none" style={styles.serviceGlow} />
            <View pointerEvents="none" style={styles.serviceAccent} />
            <View style={styles.serviceTop}>
              <View style={styles.serviceIcon}>
                <service.icon size={29} color={colors.accent} strokeWidth={1.55} />
              </View>
              <Txt style={styles.serviceNumber}>{String(index + 1).padStart(2, '0')}</Txt>
            </View>
            <Txt style={styles.serviceTitle}>{service.title}</Txt>
            <Txt style={styles.serviceText}>{service.text}</Txt>
            <View style={styles.serviceBottom}>
              <Txt style={styles.serviceCta}>EXPLORAR SOLUÇÃO</Txt>
              <View style={styles.serviceArrow}>
                <ArrowRight size={18} color={colors.ink} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
