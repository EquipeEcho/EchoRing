import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CheckCircle2, CircleX, ShieldCheck } from 'lucide-react-native';
import { Brand, Button, Txt, common } from '@/components/ui/primitives';
import { colors } from '@/constants/design';
import { submitQuoteDecision } from './service';

export function QuoteResponseScreen() {
  const params = useLocalSearchParams<{ id: string; decision?: string; '#': string }>();
  const [token] = useState(typeof params['#'] === 'string' ? params['#'] : '');
  const [choice, setChoice] = useState<'approve' | 'decline'>(params.decision === 'decline' ? 'decline' : 'approve');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<'Orçamento aprovado' | 'Orçamento recusado' | ''>('');

  useEffect(() => {
    if (params['#']) router.setParams({ '#': '' });
  }, [params]);

  async function confirm() {
    if (!token || busy) {
      setError('Este link não contém a autorização necessária. Use o link recebido por e-mail.');
      return;
    }
    setBusy(true); setError('');
    try {
      const response = await submitQuoteDecision(params.id, token, choice);
      setResult(response.status);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.card}>
      <Brand />
      {result ? <View style={s.center}>
        {result === 'Orçamento aprovado' ? <CheckCircle2 size={54} color={colors.green} /> : <CircleX size={54} color={colors.amber} />}
        <Txt accessibilityRole="header" style={s.title}>{result}</Txt>
        <Txt style={s.description}>{result === 'Orçamento aprovado'
          ? 'Obrigado. Nossa equipe já pode preparar a tarefa e indicar o tradutor responsável.'
          : 'Sua resposta foi registrada. A equipe poderá entrar em contato caso seja necessário.'}</Txt>
        <Button variant="secondary" onPress={() => router.replace('/')}>Voltar ao site</Button>
      </View> : <>
        <View style={s.heading}><View style={s.icon}><ShieldCheck size={26} color={colors.accent} /></View><View style={{ flex: 1, gap: 5 }}>
          <Txt style={s.eyebrow}>RESPOSTA DO ORÇAMENTO</Txt>
          <Txt accessibilityRole="header" style={s.title}>Confirme sua decisão</Txt>
          <Txt style={s.description}>Proposta {params.id}. Esta resposta só poderá ser registrada uma vez.</Txt>
        </View></View>
        <View style={s.choices}>
          <Button variant={choice === 'approve' ? 'primary' : 'secondary'} icon={CheckCircle2} disabled={busy} onPress={() => setChoice('approve')}>Aprovar orçamento</Button>
          <Button variant={choice === 'decline' ? 'primary' : 'secondary'} icon={CircleX} disabled={busy} onPress={() => setChoice('decline')}>Recusar orçamento</Button>
        </View>
        <Txt style={common.caption}>Ao confirmar, a equipe receberá sua decisão vinculada a esta proposta. O link é pessoal; não o compartilhe.</Txt>
        {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
        <View style={s.actions}><Button variant="ghost" disabled={busy} onPress={() => router.replace('/')}>Cancelar</Button><Button loading={busy} onPress={() => void confirm()}>Confirmar {choice === 'approve' ? 'aprovação' : 'recusa'}</Button></View>
      </>}
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 22, backgroundColor: colors.canvas },
  card: { width: '100%', maxWidth: 680, gap: 28, padding: 30, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 24 },
  center: { alignItems: 'center', gap: 18, paddingVertical: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  icon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  eyebrow: { fontSize: 10, letterSpacing: 1.8, color: colors.accent, fontWeight: '600' },
  title: { fontSize: 29, lineHeight: 37, fontWeight: '700', textAlign: 'center' },
  description: { maxWidth: 520, color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  choices: { gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 },
  error: { color: colors.red, fontSize: 14, lineHeight: 21 },
});
