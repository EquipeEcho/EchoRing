import { Redirect } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, LogOut, Save, UserRoundCheck } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Txt } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSession } from '@/features/auth/contexts/session-context';
import { needsTranslatorOnboarding } from '@/features/auth/types';
import { ProfileField } from '@/features/translators/components/profile-field';
import { ProfileLanguages } from '@/features/translators/components/profile-languages';
import { ProfileTagsField } from '@/features/translators/components/profile-tags-field';
import { profileSteps, serviceOptions, specializationOptions } from '@/features/translators/constants';
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
  const textField = (key: 'fullName' | 'phone' | 'country' | 'city' | 'timezone' | 'professionalTitle' | 'bio' | 'education' | 'experienceSummary' | 'certifications' | 'availabilityNotes' | 'otherInformation', label: string, placeholder: string, multiline = false, hint?: string) => <ProfileField
    key={key} label={label} value={data[key]} onChange={value => change(key, value)} placeholder={placeholder}
    multiline={multiline} hint={hint} error={errors[key]} disabled={busy}
    keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
    maxLength={['bio', 'experienceSummary'].includes(key) ? 4000 : ['education', 'certifications', 'otherInformation'].includes(key) ? 3000 : key === 'availabilityNotes' ? 1000 : key === 'phone' ? 40 : ['country', 'city'].includes(key) ? 100 : key === 'timezone' ? 80 : 160}
  />;
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
                  <Txt accessibilityRole="header" style={styles.sectionTitle}>{['Contato e localização', 'Idiomas e pares de tradução', 'Formação e experiência', 'Seu perfil profissional'][step]}</Txt>
                  <Txt style={styles.sectionDescription}>{[
                    'Confirme suas informações de contato. Campos com * são obrigatórios.',
                    'Conte quais idiomas domina e em quais direções você traduz.',
                    'Apresente sua formação, sua trajetória e suas áreas de atuação.',
                    'Enriqueça seu perfil com informações opcionais e confira o cadastro antes de concluir.',
                  ][step]}</Txt>
                </View>
                {step === 0 && <View style={styles.section}>
                  {textField('fullName', 'Nome completo *', 'Como a equipe deve chamar você?')}
                  <ProfileField label="E-mail da conta" value={session?.email ?? ''} readOnly hint="Este é o e-mail informado pelo administrador." />
                  {textField('phone', 'Telefone *', '+55 (11) 99999-9999')}
                  <Pressable accessibilityRole="checkbox" accessibilityLabel="Este telefone também tem WhatsApp" aria-checked={data.whatsapp}
                    accessibilityState={{ checked: data.whatsapp, disabled: busy }} disabled={busy} onPress={() => change('whatsapp', !data.whatsapp)} style={styles.checkRow}>
                    <View style={[styles.checkbox, data.whatsapp && styles.checked]}>{data.whatsapp && <Check size={15} color={colors.onAccent} strokeWidth={3} />}</View>
                    <Txt style={{ fontSize: 13, flex: 1 }}>Este telefone também tem WhatsApp</Txt>
                  </Pressable>
                  {textField('country', 'País *', 'País onde você mora')}
                  {textField('city', 'Cidade *', 'Sua cidade')}
                  {textField('timezone', 'Fuso horário (opcional)', 'Seu fuso ou horário local')}
                </View>}
                {step === 1 && <ProfileLanguages data={data} change={change} disabled={busy} errors={errors} />}
                {step === 2 && <View style={styles.section}>
                  {textField('education', 'Formação *', 'Cursos, instituições, formação acadêmica ou autodidata...', true, 'Inclua o que contribuiu para sua atuação como tradutor.')}
                  <ProfileField label="Anos de experiência *" value={data.experienceYears === null ? '' : String(data.experienceYears)} placeholder="Ex.: 0, 3, 10" keyboardType="numeric" maxLength={2}
                    disabled={busy} error={errors.experienceYears} hint="Se está começando, informe 0."
                    onChange={value => { if (/^\d{0,2}$/.test(value)) change('experienceYears', value ? Number(value) : null); }} />
                  {textField('experienceSummary', 'Experiência e trajetória *', 'Conte sobre os projetos, trabalhos ou estudos que marcaram sua trajetória...', true, 'Você também pode contar sobre estágios, projetos de estudo ou início de carreira.')}
                  <ProfileTagsField label="Especializações *" values={data.specializations} options={specializationOptions} placeholder="Outra área de atuação" disabled={busy} error={errors.specializations} onChange={values => change('specializations', values)} />
                </View>}
                {step === 3 && <View style={styles.section}>
                  {textField('professionalTitle', 'Título profissional (opcional)', 'Como você descreve seu trabalho?')}
                  {textField('bio', 'Sobre você (opcional)', 'Sua apresentação, seus interesses e diferenciais...', true)}
                  <ProfileTagsField label="Serviços" values={data.services} options={serviceOptions} placeholder="Outro serviço" disabled={busy} onChange={values => change('services', values)} />
                  <ProfileTagsField label="Ferramentas" values={data.tools} placeholder="Ferramentas de tradução, revisão ou edição" disabled={busy} limit={30} onChange={values => change('tools', values)} />
                  {textField('certifications', 'Certificações e cursos complementares (opcional)', 'Certificações, instituições e ano de conclusão...', true)}
                  <ProfileTagsField label="Portfólio" values={data.portfolioLinks} placeholder="https://..." disabled={busy} limit={10} links onChange={values => change('portfolioLinks', values)} />
                  <ProfileField label="Disponibilidade semanal (opcional)" value={data.availabilityHours === null ? '' : String(data.availabilityHours)} placeholder="Horas por semana, de 0 a 80" keyboardType="numeric" maxLength={2} disabled={busy} error={errors.availabilityHours}
                    onChange={value => { if (/^\d{0,2}$/.test(value)) change('availabilityHours', value ? Number(value) : null); }} />
                  {textField('availabilityNotes', 'Sobre sua disponibilidade (opcional)', 'Horários preferidos, formatos de trabalho ou observações...', true)}
                  {textField('otherInformation', 'Outras informações (opcional)', 'Projetos relevantes ou algo mais que gostaria de compartilhar...', true)}
                  <View style={styles.review}>
                    <Txt style={styles.sectionLabel}>Confira seu cadastro</Txt>
                    <Txt style={styles.summary}>{data.fullName}{`\n`}{session?.email}{`\n`}{data.phone} · {data.city}, {data.country}</Txt>
                    <Txt style={styles.summary}>{data.languages.map(language => `${language.name} (${language.level})`).join(' · ')}</Txt>
                    <Txt style={styles.summary}>{data.translationPairs.map(pair => `${pair.source} → ${pair.target}`).join(' · ')}</Txt>
                    <Txt style={styles.summary}>{data.experienceYears} anos de experiência · {data.specializations.join(', ')}</Txt>
                    <Txt style={styles.summary}>Formação: {data.education}</Txt>
                    <Txt style={styles.summary}>Trajetória: {data.experienceSummary}</Txt>
                  </View>
                </View>}
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
