import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Clock3, Languages, PackageCheck, RefreshCw, ShieldAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { formatSelectedDate } from '@/components/ui/fields/date-utils';
import { SkeletonList } from '@/components/ui/skeleton';
import { Txt } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { RequestProgress } from '@/features/requests/components/request-progress';
import { getTracking } from '@/features/requests/services/request-service';
import { useStyles } from '@/features/requests/styles/order-tracking.styles';
import { type PublicTracking, type TrackingLanguageStatus } from '@/features/requests/types';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';
import { breakpoints } from '@/theme/tokens';
import { money } from '@/utils/formatters';

const languageTone: Record<TrackingLanguageStatus, BadgeTone> = {
  'Aguardando início': 'neutral',
  'Em tradução': 'blue',
  'Em revisão': 'blue',
  Pronta: 'green',
  Entregue: 'green',
};

/** What the client reads as the headline of each stage. */
function headline(tracking: PublicTracking) {
  const delivered = tracking.languages.filter(language => language.status === 'Entregue').length;
  if (tracking.status === 'Entregue') return { icon: PackageCheck, title: 'Pedido entregue', text: 'Todos os arquivos traduzidos foram enviados para o seu e-mail.' };
  if (delivered) return { icon: PackageCheck, title: 'Entrega em andamento', text: `${delivered} de ${tracking.languages.length} idiomas já foram entregues por e-mail.` };
  if (tracking.status === 'Orçamento aprovado') return { icon: CheckCircle2, title: 'Pedido confirmado', text: 'Estamos definindo o tradutor responsável por cada idioma.' };
  return { icon: Languages, title: 'Tradução em andamento', text: 'Nossa equipe está traduzindo e revisando os documentos.' };
}

const longDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

export function OrderTrackingScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  const mobile = width < breakpoints.phone;
  const params = useLocalSearchParams<{ id: string; '#': string }>();
  const [token] = useState(typeof params['#'] === 'string' ? params['#'] : '');
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(token ? '' : 'Este link não contém a autorização necessária. Use o link recebido por e-mail.');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    // Keep the personal token out of the address bar once it has been read.
    if (params['#']) router.setParams({ '#': '' });
  }, [params]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await getTracking(params.id, token);
        if (!active) return;
        setTracking(result);
        setError('');
      } catch (failure) {
        if (active) setError((failure as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [params.id, token, revision]);

  const summary = tracking && headline(tracking);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={[styles.page, mobile && styles.pageMobile]}>
        <View style={[styles.card, mobile && styles.cardMobile]}>
          <View style={styles.brandRow}>
            <Brand compact={mobile} />
            <ThemeToggle />
          </View>
          <View style={styles.heading}>
            <Txt style={common.eyebrow}>ACOMPANHAMENTO DO PEDIDO</Txt>
            <Txt accessibilityRole="header" style={[styles.title, mobile && styles.titleMobile]}>
              {tracking?.title ?? 'Seu pedido'}
            </Txt>
            <Txt style={styles.subtitle}>
              Protocolo {params.id}
              {tracking ? ` · ${tracking.source} → ${tracking.targets.join(', ')}` : ''}
            </Txt>
          </View>

          {loading && !tracking && <SkeletonList label="Carregando o andamento do pedido" rows={3} variant="card" />}

          {!!error && !tracking && (
            <View style={styles.center}>
              <ShieldAlert size={42} color={colors.amber} />
              <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt>
              {!!token && (
                <Button variant="secondary" onPress={() => setRevision(current => current + 1)}>Tentar novamente</Button>
              )}
            </View>
          )}

          {tracking && summary && (
            <>
              <View style={styles.status}>
                <View style={styles.statusIcon}>
                  <summary.icon size={24} color={colors.ink} />
                </View>
                <View style={styles.statusCopy}>
                  <Txt accessibilityLiveRegion="polite" style={styles.statusTitle}>{summary.title}</Txt>
                  <Txt style={common.caption}>{summary.text}</Txt>
                </View>
              </View>

              <RequestProgress request={tracking} />

              <View style={styles.facts}>
                <View style={styles.fact}>
                  <Txt style={styles.factLabel}>Previsão de entrega</Txt>
                  <Txt style={styles.factValue}>{tracking.delivery ? formatSelectedDate(tracking.delivery) : 'A confirmar'}</Txt>
                </View>
                {!!tracking.approvedAmount && (
                  <View style={styles.fact}>
                    <Txt style={styles.factLabel}>Valor aprovado</Txt>
                    <Txt style={styles.factValue}>{money(tracking.approvedAmount)}</Txt>
                  </View>
                )}
                <View style={styles.fact}>
                  <Txt style={styles.factLabel}>Aprovado em</Txt>
                  <Txt style={styles.factValue}>{longDate(tracking.quoteRespondedAt) || '—'}</Txt>
                </View>
              </View>

              <View style={styles.section}>
                <Txt style={common.eyebrow}>IDIOMAS</Txt>
                {tracking.languages.map(language => (
                  <View key={language.target} style={styles.language}>
                    <View style={styles.languageCopy}>
                      <Txt style={styles.languageTitle}>{tracking.source} → {language.target}</Txt>
                      <Txt style={common.caption}>
                        {language.deliveredAt
                          ? `Entregue em ${longDate(language.deliveredAt)}. O arquivo foi enviado para o seu e-mail.`
                          : language.delivery ? `Previsão: ${formatSelectedDate(language.delivery)}` : 'Previsão a confirmar'}
                      </Txt>
                    </View>
                    <Badge dot tone={languageTone[language.status] ?? 'neutral'}>{language.status}</Badge>
                  </View>
                ))}
              </View>

              <View style={styles.note}>
                <View style={common.row}>
                  <Clock3 size={16} color={colors.muted} />
                  <Txt style={[common.caption, { flex: 1 }]}>
                    Esta página mostra o andamento atualizado sempre que é aberta. O link é pessoal; não o compartilhe.
                    Para falar com a equipe, responda ao e-mail de confirmação informando o protocolo.
                  </Txt>
                </View>
              </View>

              <View style={styles.actions}>
                <Button variant="secondary" icon={RefreshCw} loading={loading} onPress={() => setRevision(current => current + 1)}>
                  Atualizar
                </Button>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
