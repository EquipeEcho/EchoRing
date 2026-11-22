import { Mail, RotateCw } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/requests/styles/requests.styles';
import { type TranslationRequest } from '@/features/requests/types';
import { requestAlerts } from '@/features/requests/utils/request-alerts';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

const shortDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';

export function RequestAlertBadges({ request }: { request: TranslationRequest }) {
  const styles = useStyles();
  const alerts = requestAlerts(request);
  if (!alerts.length) return null;
  return (
    <View accessibilityLabel={`Precisa de atenção: ${alerts.map(alert => alert.label).join('; ')}`} style={styles.alertBadges}>
      {alerts.map(alert => <Badge key={alert.kind} dot tone={alert.tone}>{alert.label}</Badge>)}
    </View>
  );
}

/** Waiting state of a sent quote, with resending once the client takes too long or the link is about to expire. */
export function QuoteFollowUp({ request, busy, onResend }: {
  request: TranslationRequest;
  busy: boolean;
  onResend?: () => Promise<void>;
}) {
  const styles = useStyles();
  const common = useCommonStyles();
  const { colors } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const alerts = requestAlerts(request).filter(alert => alert.kind === 'resposta' || alert.kind === 'link');
  const details = [
    request.emailSentAt && `${request.quoteResentAt ? 'Reenviado' : 'Enviado'} em ${shortDate(request.emailSentAt)}`,
    request.quoteExpiresAt && `link válido até ${shortDate(request.quoteExpiresAt)}`,
  ].filter(Boolean).join(' · ');
  return (
    <View style={[styles.waiting, styles.followUp, alerts.length > 0 && styles.followUpAlert]}>
      <View style={styles.followUpHeading}>
        <Mail size={20} color={alerts.some(alert => alert.tone === 'red') ? colors.red : alerts.length ? colors.amber : colors.blue} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt style={{ fontWeight: '600' }}>Aguardando a resposta do cliente</Txt>
          {!!details && <Txt style={common.caption}>{details}</Txt>}
          <Txt style={common.caption}>
            {alerts.length && onResend
              ? 'Reenvie o orçamento para lembrar o cliente. Um novo link pessoal será enviado e o anterior deixará de valer.'
              : 'O e-mail contém links pessoais para aprovar ou recusar. Atualize a lista para consultar a decisão.'}
          </Txt>
        </View>
      </View>
      {!!onResend && (confirming ? (
        <View style={styles.followUpActions}>
          <Txt style={[common.caption, { flex: 1 }]}>Enviar novamente para {request.email}?</Txt>
          <Button variant="secondary" disabled={busy} onPress={() => setConfirming(false)}>Cancelar</Button>
          <Button icon={RotateCw} loading={busy} onPress={() => void onResend().finally(() => setConfirming(false))}>
            Confirmar reenvio
          </Button>
        </View>
      ) : (
        <View style={styles.followUpActions}>
          <Button variant={alerts.length ? 'primary' : 'secondary'} icon={RotateCw} disabled={busy} onPress={() => setConfirming(true)}>
            Reenviar orçamento
          </Button>
        </View>
      ))}
    </View>
  );
}
