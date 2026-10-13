import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, CircleX, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { submitQuoteDecision } from '@/features/requests/services/request-service';
import { useStyles } from '@/features/requests/styles/quote-response.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function QuoteResponseScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id: string; decision?: string; '#': string }>();
  const [token] = useState(typeof params['#'] === 'string' ? params['#'] : '');
  const [choice, setChoice] = useState<'approve' | 'decline'>(
    params.decision === 'decline' ? 'decline' : 'approve',
  );
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
    setBusy(true);
    setError('');
    try {
      const response = await submitQuoteDecision(params.id, token, choice);
      setResult(response.status);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <Txt accessibilityRole="header" style={styles.title}>
              {result}
            </Txt>
            <Txt style={styles.description}>
              {result === 'Orçamento aprovado'
                ? 'Obrigado. Nossa equipe já pode preparar a tarefa e indicar o tradutor responsável.'
                : 'Sua resposta foi registrada. A equipe poderá entrar em contato caso seja necessário.'}
            </Txt>
            <Button variant="secondary" onPress={() => router.replace('/')}>
              Voltar ao site
            </Button>
          </View>
        ) : (
          <>
            <View style={styles.heading}>
              <View style={styles.icon}>
                <ShieldCheck size={26} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Txt style={styles.eyebrow}>RESPOSTA DO ORÇAMENTO</Txt>
                <Txt accessibilityRole="header" style={styles.title}>
                  Confirme sua decisão
                </Txt>
                <Txt style={styles.description}>
                  Proposta {params.id}. Esta resposta só poderá ser registrada uma vez.
                </Txt>
              </View>
            </View>
            <View style={styles.choices}>
              <Button
                variant={choice === 'approve' ? 'primary' : 'secondary'}
                icon={CheckCircle2}
                disabled={busy}
                onPress={() => setChoice('approve')}
              >
                Aprovar orçamento
              </Button>
              <Button
                variant={choice === 'decline' ? 'primary' : 'secondary'}
                icon={CircleX}
                disabled={busy}
                onPress={() => setChoice('decline')}
              >
                Recusar orçamento
              </Button>
            </View>
            <Txt style={common.caption}>
              Ao confirmar, a equipe receberá sua decisão vinculada a esta proposta. O link é
              pessoal; não o compartilhe.
            </Txt>
            {!!error && (
              <Txt accessibilityRole="alert" style={styles.error}>
                {error}
              </Txt>
            )}
            <View style={styles.actions}>
              <Button variant="ghost" disabled={busy} onPress={() => router.replace('/')}>
                Cancelar
              </Button>
              <Button loading={busy} onPress={() => void confirm()}>
                Confirmar {choice === 'approve' ? 'aprovação' : 'recusa'}
              </Button>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
