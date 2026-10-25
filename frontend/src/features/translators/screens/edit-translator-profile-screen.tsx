import { Redirect, router } from 'expo-router';
import { Save, UserRound, ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { ProfileFormSection } from '@/features/translators/components/profile-form-section';
import { useTranslatorProfile } from '@/features/translators/hooks/use-translator-profile';
import { saveTranslatorProfile } from '@/features/translators/services/translator-profile-service';
import { useStyles } from '@/features/translators/styles/profile.styles';
import { type ProfileErrors, type TranslatorProfile, type TranslatorProfileRecord } from '@/features/translators/types';
import { validateProfileStep } from '@/features/translators/utils/profile-validation';
import { useTheme } from '@/theme/theme-context';

export function EditTranslatorProfileScreen() {
  const { session } = useSession();
  if (session?.role !== 'translator') return <Redirect href="/dashboard" />;
  if (session.demo) return <Redirect href="/perfil" />;
  return <LoadEditor />;
}

function LoadEditor() {
  const { record, loading, error, retry } = useTranslatorProfile();
  const { colors } = useTheme();
  const styles = useStyles();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.accent} accessibilityLabel="Carregando edição do perfil" /></View>;
  if (!record || error) return <ScrollView contentContainerStyle={styles.page}><EmptyState icon={UserRound} title="Não foi possível carregar seu perfil" text={error || 'Tente novamente.'} action={<Button onPress={retry}>Tentar novamente</Button>} /></ScrollView>;
  return <ProfileEditor record={record} />;
}

function ProfileEditor({ record }: { record: TranslatorProfileRecord }) {
  const { session, updateAccount } = useSession();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const [data, setData] = useState(record.profile);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const dirty = JSON.stringify(data) !== JSON.stringify(record.profile);
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change<Key extends keyof TranslatorProfile>(key: Key, value: TranslatorProfile[Key]) {
    setData(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: undefined })); setError('');
  }
  async function save() {
    if (!session?.token || busy) return;
    const invalid = [0, 1, 2, 3].map(index => validateProfileStep(data, index));
    const first = invalid.findIndex(fields => Object.keys(fields).length);
    if (first !== -1) { setErrors(Object.assign({}, ...invalid)); setStep(first); setError('Confira os campos destacados antes de salvar.'); return; }
    setBusy(true); setError('');
    try {
      const saved = await saveTranslatorProfile(data, session.token, true);
      await updateAccount(saved.account);
      router.replace('/perfil?atualizado=1');
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  function cancel() { if (dirty) setDiscard(true); else router.replace('/perfil'); }
  return <>
    <ScrollView contentContainerStyle={[styles.page, width < 700 && styles.pageSmall]} keyboardShouldPersistTaps="handled">
      <View style={styles.editor}>
        <PageHeading spacing="flush" title="Editar meu perfil" subtitle="Mantenha suas informações profissionais e de contato atualizadas." />
        <View accessibilityRole="tablist" style={styles.tabs}>
          {['Contato', 'Idiomas', 'Trajetória', 'Perfil profissional'].map((label, index) => <Pressable key={label} accessibilityRole="tab" aria-selected={step === index} accessibilityState={{ selected: step === index, disabled: busy }} disabled={busy} onPress={() => setStep(index)} style={[styles.tab, step === index && styles.tabActive]}><Txt style={[styles.tabText, step === index && styles.tabTextActive]}>{label}</Txt></Pressable>)}
        </View>
        <View testID="translator-profile-editor" style={[styles.card, width < 600 && styles.cardSmall]}>
          <View style={styles.editorHeading}>
            <Txt style={styles.eyebrow}>INFORMAÇÕES PROFISSIONAIS</Txt>
            <Txt accessibilityRole="header" style={styles.editorTitle}>{['Contato e localização', 'Idiomas', 'Formação e experiência', 'Seu perfil profissional'][step]}</Txt>
            <Txt style={styles.muted}>Campos com * são obrigatórios. As alterações são salvas somente ao escolher Salvar alterações.</Txt>
          </View>
          <ProfileFormSection data={data} email={record.account.email} step={step} disabled={busy} errors={errors} change={change} />
          {!!error && <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt>}
          <View style={styles.editorFooter}><Txt style={styles.muted}>{dirty ? 'Alterações não salvas' : 'Nenhuma alteração pendente'}</Txt>
            <View style={styles.row}><Button variant="secondary" icon={ArrowLeft} disabled={busy} onPress={cancel}>Cancelar</Button><Button icon={Save} loading={busy} onPress={() => void save()}>Salvar alterações</Button></View>
          </View>
        </View>
      </View>
    </ScrollView>
    <Dialog open={discard} onClose={() => setDiscard(false)} size="compact" title="Descartar alterações?" description="Suas alterações ainda não foram salvas.">
      <Button variant="secondary" onPress={() => setDiscard(false)}>Continuar editando</Button>
      <Button onPress={() => { setDiscard(false); router.replace('/perfil'); }}>Descartar alterações</Button>
    </Dialog>
  </>;
}
