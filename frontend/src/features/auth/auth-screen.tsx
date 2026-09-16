import { useState, type ReactNode } from 'react';
import { Link } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Mail } from 'lucide-react-native';
import { Brand, Button, IconButton, Txt } from '@/components/ui/primitives';
import { colors, font } from '@/constants/design';
import { useSession } from './session';

function AuthFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const small = width < 600;
  return <View style={s.background}>
    <Image source={require('../../../assets/images/workspace.jpg')} contentFit="cover" style={StyleSheet.absoluteFill} />
    <View style={s.wash} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.page, small && s.pageSmall]} keyboardShouldPersistTaps="handled">
        <View style={s.top}><Brand /></View>
        <View style={s.center}><View style={[s.form, small && s.formSmall]}>{children}</View></View>
        <View style={s.footer}><Txt style={s.footerText}>© 2026 Aliança Traduções</Txt><Txt style={s.footerText}>Echo Ring</Txt></View>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

function EmailField({ value, onChange, error, onSubmit }: { value: string; onChange: (value: string) => void; error?: string; onSubmit?: () => void }) {
  return <View style={s.field}><Txt style={s.label}>E-mail</Txt><View style={[s.inputWrap, !!error && s.invalid]}><TextInput
    accessibilityLabel="E-mail" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email"
    placeholder="seu@email.com" placeholderTextColor="#98A19B" value={value} onChangeText={onChange} onSubmitEditing={onSubmit} style={s.input} /></View>
    {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}</View>;
}

export function LoginScreen() {
  const { enterDemo, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setEmailError(''); setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setEmailError('Informe um e-mail válido.'); return; }
    if (!password) { setError('Informe sua senha.'); return; }
    setBusy(true);
    try { await signIn(email, password); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  }
  return <AuthFrame>
    <Txt accessibilityRole="header" style={s.title}>Acesse sua conta</Txt>
    <Txt style={s.subtitle}>Entre com seu e-mail e senha.</Txt>
    <View style={s.fields}>
      <EmailField value={email} onChange={v => { setEmail(v); setEmailError(''); }} error={emailError} onSubmit={submit} />
      <View style={s.field}><View style={s.labelRow}><Txt style={s.label}>Senha</Txt><Link href="/recuperar-senha" style={s.link}>Esqueci minha senha</Link></View>
        <View style={[s.inputWrap, !!error && s.invalid]}><TextInput accessibilityLabel="Senha" value={password}
          onChangeText={v => { setPassword(v); setError(''); }} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" placeholder="Digite sua senha"
          placeholderTextColor="#98A19B" style={s.input} onSubmitEditing={submit} />
          <IconButton icon={visible ? EyeOff : Eye} label={visible ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setVisible(!visible)} />
        </View>
      </View>
      {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
      <Button onPress={submit} loading={busy}>Entrar</Button>
    </View>
    <View style={s.demo}><View style={s.divider} /></View>
    <Button onPress={enterDemo} variant="secondary">Acessar demonstração</Button>
    <Txt style={s.demoNote}>Ambiente de teste com dados fictícios.</Txt>
  </AuthFrame>;
}

export function RecoveryScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Informe um e-mail válido.'); return; }
    setSent(true);
  }
  return <AuthFrame>
    <View style={s.lock}>{sent ? <CheckCircle2 size={24} color={colors.green} /> : <Mail size={24} color={colors.green} />}</View>
    <Txt accessibilityRole="header" style={s.title}>{sent ? 'Solicitação simulada' : 'Recuperar acesso'}</Txt>
    <Txt style={s.subtitle}>{sent ? 'Neste ambiente demonstrativo, nenhum e-mail é enviado e nenhuma senha é alterada.' : 'Informe o e-mail associado à sua conta.'}</Txt>
    {!sent && <View style={s.fields}><EmailField value={email} onChange={v => { setEmail(v); setError(''); }} error={error} onSubmit={submit} /><Button onPress={submit}>Simular recuperação</Button></View>}
    <Link href="/login" asChild><Pressable style={s.back}><ArrowLeft size={16} color={colors.green} /><Txt style={s.link}>Voltar para o login</Txt></Pressable></Link>
  </AuthFrame>;
}

const s = StyleSheet.create({
  background: { flex: 1, overflow: 'hidden', backgroundColor: colors.canvas },
  wash: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(245,246,247,0.94)' },
  page: { flexGrow: 1, paddingHorizontal: 48, paddingVertical: 30, minHeight: '100%' },
  pageSmall: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 38 },
  form: { width: '100%', maxWidth: 420, backgroundColor: colors.white, borderRadius: 4, borderWidth: 1, borderColor: colors.line, padding: 32 },
  formSmall: { paddingHorizontal: 0, paddingVertical: 16, backgroundColor: 'transparent', borderWidth: 0 },
  lock: { width: 46, height: 46, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginBottom: 24 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  fields: { gap: 22, marginTop: 28 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  inputWrap: { minHeight: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: '#BDC2C7', borderRadius: 4, paddingLeft: 12, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minWidth: 0, minHeight: 46, fontSize: 16, fontFamily: font, color: colors.ink, outlineWidth: 0 },
  invalid: { borderColor: colors.red },
  error: { fontSize: 12, color: colors.red, lineHeight: 18 },
  link: { fontSize: 13, fontFamily: font, color: colors.green, fontWeight: '500' },
  demo: { flexDirection: 'row', marginTop: 24, marginBottom: 24 },
  divider: { flex: 1, height: 1, backgroundColor: colors.line },
  demoNote: { marginTop: 12, textAlign: 'center', fontSize: 12, color: colors.muted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  footerText: { fontSize: 10, color: '#5B6A60' },
  back: { marginTop: 24, minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
});
