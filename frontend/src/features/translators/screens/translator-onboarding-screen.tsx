import { Redirect } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, LogOut, Save, UserRoundCheck } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Txt } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSession } from '@/features/auth/contexts/session-context';
import { needsTranslatorOnboarding } from '@/features/auth/types';
import { profileSteps } from '@/features/translators/constants';
import { ProfileFormSection } from '@/features/translators/components/profile-form-section';
import { useTranslatorOnboarding } from '@/features/translators/hooks/use-translator-onboarding';
import { useStyles } from '@/features/translators/styles/onboarding.styles';
import { useTheme } from '@/theme/theme-context';

export function TranslatorOnboardingScreen() {
  const { session } = useSession();
  if (!session) return <Redirect href="/login" />;
  if (!needsTranslatorOnboarding(session)) return <Redirect href="/dashboard" />;
  return <OnboardingForm />;
}

function OnboardingForm() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { session, signOut } = useSession();
  const form = useTranslatorOnboarding();
  const { data, step, loading, loadError, busy, errors, change } = form;
  const { width } = useWindowDimensions();
  const small = width < 850;
  const narrow = width < 600;
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, small && styles.pageSmall]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Brand compact={narrow} wordmarkOnly={width < 380} />
            <View style={styles.headerActions}>
              <ThemeToggle />
              <Button variant="ghost" icon={LogOut} disabled={busy || loading} onPress={signOut}>Sair</Button>
            </View>
          </View>
          <View style={[styles.layout, small && styles.layoutSmall]}>
            <View style={[styles.intro, small && styles.introSmall]}>
              <Txt style={styles.eyebrow}>BEM-VINDO AO ECHO RING</Txt>
              <Txt accessibilityRole="header" style={styles.title}>Seu talento.{`\n`}Seu próximo passo.</Txt>
              <Txt style={styles.description}>Complete seu cadastro para a equipe conhecer seu trabalho e você começar a usar o portal.</Txt>
              {small ? <>
                <Txt accessibilityLiveRegion="polite" style={styles.label}>Etapa {step + 1} de 4 · {profileSteps[step]}</Txt>
                <View style={styles.track}><View style={[styles.progress, { width: `${(step + 1) * 25}%` }]} /></View>
              </> : <View style={styles.stepList}>
                {profileSteps.map((title, index) => <View key={title} style={styles.stepRow}>
                  <View style={[styles.stepNumber, index === step && styles.stepCurrent, index < step && styles.stepDone]}>
                    {index < step ? <Check size={16} color={colors.accent} /> : <Txt style={{ fontSize: 13, fontWeight: '600', color: index === step ? colors.onAccent : colors.muted }}>{index + 1}</Txt>}
                  </View>
                  <Txt style={[styles.stepLabel, index === step && { color: colors.ink, fontWeight: '600' }]}>{title}</Txt>
                </View>)}
              </View>}
              <Txt style={styles.note}>As informações ficarão vinculadas ao seu perfil de tradutor. Seu progresso é salvo ao avançar ou salvar um rascunho.</Txt>
            </View>
            <View testID="translator-onboarding-form" style={[styles.card, small && styles.cardSmall]}>
              {loading ? <View style={styles.loading}><ActivityIndicator color={colors.accent} accessibilityLabel="Carregando cadastro" /></View> : loadError ? <EmptyState
                icon={UserRoundCheck} title="Não foi possível carregar seu cadastro" text={loadError}
                action={<Button variant="secondary" onPress={form.retry}>Tentar novamente</Button>}
              /> : <>
                <View style={styles.sectionHeading}>
                  <Txt style={styles.eyebrow}>ETAPA {step + 1} DE 4</Txt>
                  <Txt accessibilityRole="header" style={styles.sectionTitle}>{['Contato e localização', 'Idiomas', 'Formação e experiência', 'Seu perfil profissional'][step]}</Txt>
                  <Txt style={styles.sectionDescription}>{[
                    'Confirme suas informações de contato. Campos com * são obrigatórios.',
                    'Conte quais idiomas domina e em quais direções você traduz.',
                    'Apresente sua formação, sua trajetória e suas áreas de atuação.',
                    'Enriqueça seu perfil com informações opcionais e confira o cadastro antes de concluir.',
                  ][step]}</Txt>
                </View>
                <ProfileFormSection data={data} email={session?.email ?? ""} step={step} disabled={busy} errors={errors} change={change} review />
                {!!form.error && <Txt accessibilityRole="alert" style={styles.error}>{form.error}</Txt>}
                {!!form.notice && <View style={styles.notice}><Txt accessibilityLiveRegion="polite" style={styles.noticeText}>{form.notice}</Txt></View>}
                <View style={styles.footer}>
                  <Button variant="secondary" icon={Save} disabled={busy} onPress={() => void form.save()}>Salvar rascunho</Button>
                  <View style={styles.actions}>
                    <Button variant="ghost" icon={LogOut} disabled={busy} onPress={() => void form.saveAndExit()}>Salvar e sair</Button>
                    <View style={styles.mainActions}>
                      {step > 0 && <Button variant="secondary" icon={ArrowLeft} disabled={busy} onPress={form.previous}>Voltar</Button>}
                      {step < 3 ? <Button icon={ArrowRight} loading={busy} onPress={() => void form.next()}>Salvar e continuar</Button> : <Button icon={UserRoundCheck} loading={busy} onPress={() => void form.save(true)}>Concluir cadastro</Button>}
                    </View>
                  </View>
                </View>
              </>}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
