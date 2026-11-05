import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, CircleX, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { previewQuote, submitQuoteDecision } from '@/features/requests/services/request-service';
import { type QuotePreview } from '@/features/requests/types';
import { quoteTotal } from '@/features/requests/utils/quote-scope';
import { formatSelectedDate } from '@/components/ui/fields/date-utils';
import { money } from '@/utils/formatters';
import { useStyles } from '@/features/requests/styles/quote-response.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function QuoteResponseScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  const mobile = width < 600;
  const params = useLocalSearchParams<{ id: string; decision?: string; '#': string }>();
  const [token] = useState(typeof params['#'] === 'string' ? params['#'] : '');
  const [choice, setChoice] = useState<'approve' | 'decline'>(
    params.decision === 'decline' ? 'decline' : 'approve',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(token ? '' : 'Este link não contém a autorização necessária. Use o link recebido por e-mail.');
  const [result, setResult] = useState<'Orçamento aprovado' | 'Orçamento recusado' | ''>('');
  const [proposal, setProposal] = useState<QuotePreview | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!token);
  const [revision, setRevision] = useState(0);
  const [approved, setApproved] = useState<{ targets: string[]; amount: string } | null>(null);
  useEffect(() => {
    let active = true;
    if (!token) return;
    void previewQuote(params.id, token).then(data => {
      if (active) { setProposal(data); setTargets(data.targets); }
    }).catch(failure => { if (active) setError((failure as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id, token, revision]);
  const selectedAmount = proposal?.quote.items?.length
    ? quoteTotal(proposal.quote.items.filter(item => targets.includes(item.target)))
    : proposal?.quote.amount || '0';

  useEffect(() => {
    if (params['#']) router.setParams({ '#': '' });
  }, [params]);

  async function confirm() {
    if (!token || busy || !proposal || loading) {
      setError('Este link não contém a autorização necessária. Use o link recebido por e-mail.');
      return;
    }
    if (choice === 'approve' && !targets.length) {
      setError('Selecione pelo menos um idioma para aprovar.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await submitQuoteDecision(params.id, token, choice, choice === 'approve' ? targets : undefined);
      if (choice === 'approve') setApproved({ targets: response.approvedTargets, amount: response.approvedAmount });
      setResult(response.status);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={[styles.page, mobile && styles.pageMobile]} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, mobile && styles.cardMobile]}>
        <View style={styles.brandRow}>
          <Brand compact={width < 600} />
          <ThemeToggle />
        </View>
        {result ? (
          <View style={styles.center}>
            {result === 'Orçamento aprovado' ? (
              <CheckCircle2 size={54} color={colors.green} />
            ) : (
              <CircleX size={54} color={colors.amber} />
            )}
            <Txt accessibilityRole="header" style={[styles.title, styles.resultTitle]}>
              {result}
            </Txt>
            <Txt style={[styles.description, { textAlign: 'center' }]}>
              {result === 'Orçamento aprovado'
                ? 'Obrigado. Nossa equipe já pode preparar os trabalhos e indicar os tradutores dos idiomas aprovados.'
                : 'Sua resposta foi registrada. A equipe poderá entrar em contato caso seja necessário.'}
            </Txt>
            {approved && <Txt style={styles.description}>Idiomas aprovados: {approved.targets.join(', ')} · Total: {money(approved.amount)}</Txt>}
            <Button variant="secondary" onPress={() => router.replace('/')}>
              Voltar ao site
            </Button>
          </View>
        ) : (
          <>
            <View style={[styles.heading, mobile && styles.headingMobile]}>
              <View style={styles.icon}>
                <ShieldCheck size={26} color={colors.accent} />
              </View>
              <View style={[styles.headingCopy, mobile && styles.headingCopyMobile]}>
                <Txt style={styles.eyebrow}>RESPOSTA DO ORÇAMENTO</Txt>
                <Txt accessibilityRole="header" style={styles.title}>
                  Confirme sua decisão
                </Txt>
                <Txt style={styles.description}>
                  Proposta {params.id}. Esta resposta só poderá ser registrada uma vez.
                </Txt>
              </View>
            </View>
            {loading && <ActivityIndicator accessibilityLabel="Carregando proposta" color={colors.accent} />}
            {proposal && <View style={styles.choices}>
              <Txt style={styles.choiceTitle}>{proposal.title}</Txt>
              <Txt style={styles.description}>{proposal.service} · Origem: {proposal.source}</Txt>
              <Txt style={styles.description}>Selecione os idiomas que deseja aprovar. Os idiomas desmarcados não serão contratados.</Txt>
              {proposal.targets.map(target => {
                const item = proposal.quote.items?.find(item => item.target === target);
                const checked = targets.includes(target);
                return <Pressable key={target} accessibilityRole="checkbox" accessibilityLabel={`Aprovar ${target}`}
                  accessibilityState={{ checked, disabled: busy || choice === 'decline' }} aria-checked={checked}
                  disabled={busy || choice === 'decline'} onPress={() => setTargets(current => checked ? current.filter(item => item !== target) : [...current, target])}
                  style={[styles.choice, checked && styles.choiceSelected]}>
                  <Txt>{checked ? '✓' : '○'}</Txt>
                  <View style={styles.choiceCopy}>
                    <Txt style={styles.choiceTitle}>{target}</Txt>
                    <Txt style={styles.choiceDescription}>{money(item?.amount || proposal.quote.amount)} · Prazo: {formatSelectedDate(item?.delivery || proposal.quote.delivery)}</Txt>
                  </View>
                </Pressable>;
              })}
              <Txt accessibilityLiveRegion="polite" style={styles.choiceTitle}>Total selecionado: {money(choice === 'approve' ? selectedAmount : '0')}</Txt>
              {!!proposal.quote.message && <Txt style={styles.description}>{proposal.quote.message}</Txt>}
            </View>}
            <View style={styles.choices}>
              {([
                { value: 'approve', title: 'Aprovar orçamento', description: 'Autorizar a continuidade desta proposta.', icon: CheckCircle2 },
                { value: 'decline', title: 'Recusar orçamento', description: 'Informar que não deseja seguir com a proposta.', icon: CircleX },
              ] as const).map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.title}
                  accessibilityState={{ checked: choice === option.value, disabled: busy }}
                  aria-checked={choice === option.value}
                  disabled={busy || loading || !proposal}
                  onPress={() => setChoice(option.value)}
                  style={({ hovered, pressed }) => [
                    styles.choice,
                    choice === option.value && styles.choiceSelected,
                    hovered && { borderColor: colors.accent },
                    (pressed || busy) && { opacity: 0.7 },
                  ]}
                >
                  <option.icon size={22} color={choice === option.value ? colors.accent : colors.muted} />
                  <View style={styles.choiceCopy}>
                    <Txt style={styles.choiceTitle}>{option.title}</Txt>
                    <Txt style={styles.choiceDescription}>{option.description}</Txt>
                  </View>
                  <View style={[styles.choiceIndicator, choice === option.value && styles.choiceIndicatorSelected]}>
                    {choice === option.value && <View style={styles.choiceDot} />}
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={styles.note}>
              <Txt style={common.caption}>
                Ao confirmar, a equipe receberá sua decisão vinculada a esta proposta. O link é
                pessoal; não o compartilhe.
              </Txt>
            </View>
            {!!error && (
              <Txt accessibilityRole="alert" style={styles.error}>
                {error}
              </Txt>
            )}
            {!loading && !proposal && !!token && <Button variant="secondary" onPress={() => { setLoading(true); setError(''); setRevision(current => current + 1); }}>Tentar carregar proposta novamente</Button>}
            <View style={[styles.actions, mobile && styles.actionsMobile]}>
              <Button variant="ghost" disabled={busy} onPress={() => router.replace('/')}>
                Cancelar
              </Button>
              <Button loading={busy} disabled={loading || !proposal || (choice === 'approve' && !targets.length)} onPress={() => void confirm()}>
                Confirmar {choice === 'approve' ? 'aprovação' : 'recusa'}
              </Button>
            </View>
          </>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
