import { useState, type ReactNode } from 'react';
import { Link, Redirect } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Eye, EyeOff, FileText, FolderKanban, ListTodo, Mail } from 'lucide-react-native';
import { Brand, Button, IconButton, Txt } from '@/components/ui/primitives';
import { colors, font, fonts, typeScale } from '@/constants/design';
import { useSession } from './session';

function AuthFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const small = width < 600;
  return <View style={s.background}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.page, small && s.pageSmall]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
        <View style={s.top}><Brand /><Link href="/" asChild><Pressable accessibilityRole="link" style={s.backToSite}><Txt style={s.link}>Voltar ao site</Txt><ArrowUpRight size={16} color={colors.accent} /></Pressable></Link></View>
        <View style={[s.center, width >= 1100 && s.centerWide]}>
          {width >= 1100 && <View style={s.intro}>
            <Txt style={s.eyebrow}>SEU ESPAÇO DE TRABALHO</Txt>
            <Txt style={s.introTitle}>Cada palavra.{'\n'}Cada projeto.{'\n'}<Txt style={[s.introTitle, { color: colors.accent }]}>Tudo conectado.</Txt></Txt>
            <Txt style={s.introText}>Um lugar para organizar suas traduções e acompanhar cada entrega.</Txt>
            {[{ icon: FileText, title: 'Suas requisições' }, { icon: FolderKanban, title: 'Seus projetos' }, { icon: ListTodo, title: 'Suas tarefas' }].map(item => <View key={item.title} style={s.introRow}><item.icon size={25} color={colors.accent} strokeWidth={1.6} /><Txt style={s.introRowText}>{item.title}</Txt><ArrowUpRight size={19} color={colors.muted} /></View>)}
          </View>}
          <View style={[s.form, small && s.formSmall]}>{children}</View>
        </View>
        <View style={s.footer}><Txt style={s.footerText}>© 2026 Aliança Traduções</Txt><Txt style={s.footerText}>Echo Ring</Txt></View>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

function EmailField({ value, onChange, error, onSubmit }: { value: string; onChange: (value: string) => void; error?: string; onSubmit?: () => void }) {
  return <View style={s.field}><Txt style={s.label}>E-mail</Txt><View testID="auth-input" style={[s.inputWrap, !!error && s.invalid]}><TextInput
    accessibilityLabel="E-mail" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email"
    placeholder="seu@email.com" placeholderTextColor={colors.muted} value={value} onChangeText={onChange} onSubmitEditing={onSubmit} style={s.input} /></View>
    {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}</View>;
}

export function LoginScreen() {
  const { session, enterDemo, signIn } = useSession();
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
  if (session) return <Redirect href={session.role === 'translator' ? '/entregas' : '/dashboard'} />;
  return <AuthFrame>
    <View style={s.accessTag}><View style={s.accessDot} /><Txt style={s.accessTagText}>ACESSO À PLATAFORMA</Txt></View>
    <Txt accessibilityRole="header" style={s.title}>Acesse sua conta</Txt>
    <Txt style={s.subtitle}>Funcionários e tradutores entram por aqui.</Txt>
    <View style={s.fields}>
      <EmailField value={email} onChange={v => { setEmail(v); setEmailError(''); }} error={emailError} onSubmit={submit} />
      <View style={s.field}><View style={s.labelRow}><Txt style={s.label}>Senha</Txt><Link href="/recuperar-senha" style={s.link}>Esqueci minha senha</Link></View>
        <View testID="auth-input" style={[s.inputWrap, !!error && s.invalid]}><TextInput accessibilityLabel="Senha" value={password} editable={!busy}
          onChangeText={v => { setPassword(v); setError(''); }} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" placeholder="Digite sua senha"
          placeholderTextColor={colors.muted} style={s.input} onSubmitEditing={submit} />
          <IconButton icon={visible ? EyeOff : Eye} label={visible ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setVisible(!visible)} />
        </View>
      </View>
      {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
      <Button onPress={submit} loading={busy}>Entrar</Button>
    </View>
    <View style={s.demo}><View style={s.divider} /></View>
    <Button onPress={enterDemo} variant="secondary">Acessar demonstração</Button>
    <Txt style={s.demoNote}>Ambiente de teste da equipe com dados fictícios.</Txt>
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
    <View style={s.lock}>{sent ? <CheckCircle2 size={24} color={colors.accent} /> : <Mail size={24} color={colors.accent} />}</View>
    <Txt accessibilityRole="header" style={s.title}>{sent ? 'Solicitação simulada' : 'Recuperar acesso'}</Txt>
    <Txt style={s.subtitle}>{sent ? 'Neste ambiente demonstrativo, nenhum e-mail é enviado e nenhuma senha é alterada.' : 'Informe o e-mail associado à sua conta.'}</Txt>
    {!sent && <View style={s.fields}><EmailField value={email} onChange={v => { setEmail(v); setError(''); }} error={error} onSubmit={submit} /><Button onPress={submit}>Simular recuperação</Button></View>}
    <Link href="/login" asChild><Pressable style={s.back}><ArrowLeft size={16} color={colors.accent} /><Txt style={s.link}>Voltar para o login</Txt></Pressable></Link>
  </AuthFrame>;
}

const s = StyleSheet.create({
  background: { flex: 1, overflow: 'hidden', backgroundColor: colors.canvas },
  page: { flexGrow: 1, paddingHorizontal: 48, paddingVertical: 30, minHeight: '100%' },
  pageSmall: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18 },
  backToSite: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  centerWide: { flexDirection: 'row', gap: 100 },
  intro: { flex: 1, maxWidth: 480 },
  eyebrow: { fontSize: 12, letterSpacing: 2, fontWeight: '600', color: colors.muted, marginBottom: 24 },
  introTitle: { fontSize: 60, lineHeight: 64, letterSpacing: -2, fontWeight: '700' },
  introText: { fontSize: 18, lineHeight: 28, color: colors.muted, maxWidth: 370, marginTop: 24, marginBottom: 30 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 19, borderBottomWidth: 1, borderBottomColor: colors.line },
  introRowText: { flex: 1, fontSize: 22, lineHeight: 30 },
  form: { width: '100%', maxWidth: 440, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 36, boxShadow: '0 24px 70px rgba(0,0,0,0.45)' },
  formSmall: { paddingHorizontal: 0, paddingVertical: 16, backgroundColor: 'transparent', borderWidth: 0, boxShadow: 'none' },
  lock: { width: 46, height: 46, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderRadius: 23, marginBottom: 24 },
  accessTag: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  accessDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  accessTagText: { fontSize: 11, lineHeight: 17, letterSpacing: 1.5, color: colors.accent, fontWeight: '600' },
  title: { fontSize: 34, lineHeight: 42, letterSpacing: -1, fontWeight: '700', marginBottom: 8 },
  subtitle: { ...typeScale.body, color: colors.muted },
  fields: { gap: 22, marginTop: 28 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  inputWrap: { minHeight: 54, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingLeft: 16, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minWidth: 0, minHeight: 46, fontSize: 16, fontFamily: font, color: colors.ink, outlineWidth: 0 },
  invalid: { borderColor: colors.red },
  error: { fontSize: 12, color: colors.red, lineHeight: 18 },
  link: { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, color: colors.accent, fontWeight: 'normal' },
  demo: { flexDirection: 'row', marginTop: 24, marginBottom: 24 },
  divider: { flex: 1, height: 1, backgroundColor: colors.line },
  demoNote: { marginTop: 12, textAlign: 'center', fontSize: 12, color: colors.muted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  footerText: { fontSize: 12, lineHeight: 18, color: colors.muted },
  back: { marginTop: 24, minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
});
