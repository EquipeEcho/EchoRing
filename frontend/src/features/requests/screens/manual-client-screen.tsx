import { router } from 'expo-router';
import { CheckCircle2, Plus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { QuoteField } from '@/features/landing/components/quote-field';
import { useStyles as useLandingStyles } from '@/features/landing/styles/landing.styles';
import { useSession } from '@/features/auth/contexts/session-context';
import { registerClient } from '@/features/clients/services/client-service';
import { type Client, type ClientDraft } from '@/features/clients/types';
import { useCommonStyles } from '@/theme/common.styles';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';

const initialClient: ClientDraft = { name: '', email: '', company: '' };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ManualClientScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const landingStyles = useLandingStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const [data, setData] = useState<ClientDraft>({ ...initialClient });
  const [invalid, setInvalid] = useState<Partial<Record<keyof ClientDraft, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const submitting = useRef(false);
  const compact = width < 650;

  function change(key: keyof ClientDraft, value: string) {
    setData((current) => ({ ...current, [key]: value }));
    setInvalid((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError('');
  }

  async function submit() {
    if (submitting.current || busy) return;
    if (!session) {
      setError('Sua sessão expirou. Entre novamente no portal.');
      return;
    }

    const normalized: ClientDraft = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      company: data.company.trim(),
    };
    const fieldErrors: Partial<Record<keyof ClientDraft, string>> = {};
    if (!normalized.name) fieldErrors.name = 'Informe o nome do cliente.';
    if (!normalized.email) {
      fieldErrors.email = 'Informe o e-mail do cliente.';
    } else if (!emailPattern.test(normalized.email)) {
      fieldErrors.email = 'Informe um e-mail válido.';
    }
    if (Object.keys(fieldErrors).length) {
      setInvalid(fieldErrors);
      setError('Confira os dados obrigatórios do cliente.');
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      setClient(await registerClient(normalized, session));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível cadastrar o cliente.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function resetForm() {
    setData({ ...initialClient });
    setInvalid({});
    setError('');
    setClient(null);
  }

  function textField(key: keyof ClientDraft, label: string, placeholder: string) {
    return (
      <QuoteField
        width={width}
        fieldKey={key}
        label={label}
        placeholder={placeholder}
        value={data[key]}
        onChangeText={(value) => change(key, value)}
        invalid={Boolean(invalid[key])}
        disabled={busy}
        errorMessage={invalid[key]}
      />
    );
  }

  return (
    <View style={styles.page}>
      <PageHeading
        title="Cadastrar cliente"
        subtitle="Registre os dados de contato do cliente."
        action={
          <Button variant="secondary" disabled={busy} onPress={() => router.back()}>
            Cancelar
          </Button>
        }
      />
      {client ? (
        <View style={styles.confirmation}>
          <CheckCircle2 size={42} color={colors.accent} strokeWidth={1.6} />
          <Txt accessibilityRole="header" style={styles.confirmationTitle}>
            Cliente cadastrado com sucesso
          </Txt>
          <Txt style={[common.caption, { textAlign: 'center' }]}>
            {client.name} foi salvo com o e-mail {client.email}.
          </Txt>
          {client.company ? (
            <Txt style={[common.caption, { textAlign: 'center' }]}>
              Empresa: {client.company}
            </Txt>
          ) : null}
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <Button variant="secondary" disabled={busy} onPress={() => router.back()}>
              Voltar
            </Button>
            <Button onPress={resetForm}>Cadastrar outro cliente</Button>
          </View>
        </View>
      ) : (
        <View style={[landingStyles.form, styles.form, compact && styles.formCompact]}>
          <View style={styles.section}>
            <Txt style={styles.sectionTitle}>Dados do cliente</Txt>
            <Txt style={common.caption}>Informe o nome e o e-mail. A empresa é opcional.</Txt>
            <View style={[landingStyles.formRow, compact && styles.column]}>
              {textField('name', 'Nome do cliente *', 'Nome completo')}
              {textField('email', 'E-mail *', 'cliente@exemplo.com')}
            </View>
            <View style={[landingStyles.formRow, compact && styles.column]}>
              {textField('company', 'Empresa', 'Nome da empresa (opcional)')}
            </View>
          </View>

          {Boolean(error) && (
            <Txt accessibilityRole="alert" style={styles.error}>
              {error}
            </Txt>
          )}
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <Button variant="secondary" disabled={busy} onPress={() => router.back()}>
              Cancelar
            </Button>
            <Button
              icon={busy ? undefined : Plus}
              loading={busy}
              onPress={() => void submit()}
            >
              Cadastrar cliente
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  page: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  form: { width: '100%', maxWidth: 960, alignSelf: 'stretch' },
  formCompact: { padding: 20 },
  section: {
    gap: 8,
    paddingBottom: 22,
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sectionTitle: { fontSize: 18, lineHeight: 25, fontWeight: '600' },
  column: { flexDirection: 'column' },
  error: {
    color: colors.red,
    fontSize: 13,
    lineHeight: 20,
    padding: 12,
    backgroundColor: colors.redSoft,
    borderRadius: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 6,
  },
  actionsCompact: { flexDirection: 'column-reverse', alignItems: 'stretch' },
  confirmation: {
    alignItems: 'center',
    gap: 14,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 620,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  confirmationTitle: { fontSize: 22, lineHeight: 29, textAlign: 'center', fontWeight: '600' },
}));
