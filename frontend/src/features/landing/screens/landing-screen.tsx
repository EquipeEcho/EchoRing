import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FaqSection } from '@/features/landing/components/faq-section';
import { HeroSection } from '@/features/landing/components/hero-section';
import { LandingFooter } from '@/features/landing/components/landing-footer';
import { LandingHeader } from '@/features/landing/components/landing-header';
import { LanguagesSection } from '@/features/landing/components/languages-section';
import { PrivacyDialog } from '@/features/landing/components/privacy-dialog';
import { ProcessSection } from '@/features/landing/components/process-section';
import { QuoteSection } from '@/features/landing/components/quote-section';
import { ServicesSection } from '@/features/landing/components/services-section';
import { useLandingLayout } from '@/features/landing/hooks/use-landing-layout';
import { useQuoteForm } from '@/features/landing/hooks/use-quote-form';
import { useSectionNavigation } from '@/features/landing/hooks/use-section-navigation';
import { useStyles } from '@/features/landing/styles/landing.styles';
import { useTheme } from '@/theme/theme-context';

export function LandingScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const layout = useLandingLayout();
  const { scroll, go, registerSection } = useSectionNavigation();
  const form = useQuoteForm(() => go('quote'));
  function selectService(service: string) {
    form.change('service', service);
    form.setStep(0);
    go('quote');
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'bottom']}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.pageGutter }}
      >
        <View style={styles.container}>
          <LandingHeader layout={layout} onNavigate={go} />
          <HeroSection layout={layout} onLayout={registerSection('top')} onNavigate={go} />
          <ServicesSection
            layout={layout}
            onLayout={registerSection('services')}
            onSelectService={selectService}
          />
          <LanguagesSection layout={layout} onLayout={registerSection('languages')} />
          <ProcessSection layout={layout} onLayout={registerSection('process')} />
          <QuoteSection layout={layout} onLayout={registerSection('quote')} form={form} />
          <FaqSection layout={layout} />
          <LandingFooter layout={layout} onNavigate={go} />
        </View>
      </ScrollView>
      <PrivacyDialog form={form} />
    </SafeAreaView>
  );
}
