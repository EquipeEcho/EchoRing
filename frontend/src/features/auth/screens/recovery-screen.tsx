import { Link } from 'expo-router';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { AuthFrame } from '@/features/auth/components/auth-frame';
import { EmailField } from '@/features/auth/components/email-field';
import { styles } from '@/features/auth/styles/auth.styles';
import { colors } from '@/theme/tokens';

export function RecoveryScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    setSent(true);
  }
  return (
    <AuthFrame>
      <View style={styles.lock}>
        {sent ? (
          <CheckCircle2 size={24} color={colors.accent} />
        ) : (
          <Mail size={24} color={colors.accent} />
        )}
      </View>
      <Txt accessibilityRole="header" style={styles.title}>
        {sent ? 'Solicitação simulada' : 'Recuperar acesso'}
      </Txt>
      <Txt style={styles.subtitle}>
        {sent
          ? 'Neste ambiente demonstrativo, nenhum e-mail é enviado e nenhuma senha é alterada.'
          : 'Informe o e-mail associado à sua conta.'}
      </Txt>
      {!sent && (
        <View style={styles.fields}>
          <EmailField
            value={email}
            onChange={(v) => {
              setEmail(v);
              setError('');
            }}
            error={error}
            onSubmit={submit}
          />
          <Button onPress={submit}>Simular recuperação</Button>
        </View>
      )}
      <Link href="/login" asChild>
        <Pressable style={styles.back}>
          <ArrowLeft size={16} color={colors.accent} />
          <Txt style={styles.link}>Voltar para o login</Txt>
        </Pressable>
      </Link>
    </AuthFrame>
  );
}
