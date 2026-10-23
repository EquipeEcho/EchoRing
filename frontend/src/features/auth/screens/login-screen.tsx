import { Link, Redirect } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Txt } from '@/components/ui/text';
import { AuthFrame } from '@/features/auth/components/auth-frame';
import { EmailField } from '@/features/auth/components/email-field';
import { useSession } from '@/features/auth/contexts/session-context';
import { needsTranslatorOnboarding } from '@/features/auth/types';
import { useStyles } from '@/features/auth/styles/auth.styles';
import { useTheme } from '@/theme/theme-context';

export function LoginScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { session, enterDemo, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setEmailError('');
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Informe um e-mail válido.');
      return;
    }
    if (!password) {
      setError('Informe sua senha.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (session) return <Redirect href={needsTranslatorOnboarding(session) ? '/completar-cadastro' : '/dashboard'} />;
  return (
    <AuthFrame>
      <View style={styles.accessTag}>
        <View style={styles.accessDot} />
        <Txt style={styles.accessTagText}>ACESSO À PLATAFORMA</Txt>
      </View>
      <Txt accessibilityRole="header" style={styles.title}>
        Acesse sua conta
      </Txt>
      <Txt style={styles.subtitle}>Entre para acessar seu espaço de trabalho.</Txt>
      <View style={styles.fields}>
        <EmailField
          value={email}
          onChange={(v) => {
            setEmail(v);
            setEmailError('');
          }}
          error={emailError}
          onSubmit={submit}
        />
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Txt style={styles.label}>Senha</Txt>
            <Link href="/recuperar-senha" style={styles.link}>
              Esqueci minha senha
            </Link>
          </View>
          <View testID="auth-input" style={[styles.inputWrap, !!error && styles.invalid]}>
            <TextInput
              accessibilityLabel="Senha"
              value={password}
              editable={!busy}
              onChangeText={(v) => {
                setPassword(v);
                setError('');
              }}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              placeholderTextColor={colors.muted}
              style={styles.input}
              onSubmitEditing={submit}
            />
            <IconButton
              icon={visible ? EyeOff : Eye}
              label={visible ? 'Ocultar senha' : 'Mostrar senha'}
              onPress={() => setVisible(!visible)}
            />
          </View>
        </View>
        {!!error && (
          <Txt accessibilityRole="alert" style={styles.error}>
            {error}
          </Txt>
        )}
        <Button onPress={submit} loading={busy}>
          Entrar
        </Button>
      </View>
      <View style={styles.demo}>
        <View style={styles.divider} />
      </View>
      <Button onPress={enterDemo} variant="secondary">
        Acessar demonstração
      </Button>
      <Txt style={styles.demoNote}>Ambiente de teste da equipe com dados fictícios.</Txt>
    </AuthFrame>
  );
}
