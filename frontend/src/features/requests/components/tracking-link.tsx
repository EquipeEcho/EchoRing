import { Link2, Send } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/requests/styles/requests.styles';
import { type RequestStatus, type TranslationRequest } from '@/features/requests/types';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

/** Same list as `TRACKABLE_STATUSES` in `backend/app/services/tracking.py`. */
export const trackableStatuses: RequestStatus[] = [
  'Orçamento aprovado', 'Tradutor atribuído', 'Em andamento', 'Aguardando avaliação', 'Revisão solicitada', 'Pronta', 'Entregue',
];

/** Lets the team see when the client got the tracking link and send a new one if it was lost. */
export function TrackingLink({ request, busy, onSend }: { request: TranslationRequest; busy: boolean; onSend: () => Promise<void> }) {
  const styles = useStyles();
  const common = useCommonStyles();
  const { colors } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const sentAt = request.trackingSentAt
    ? new Date(request.trackingSentAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
  return (
    <View style={[styles.waiting, styles.followUp]}>
      <View style={styles.followUpHeading}>
        <Link2 size={20} color={colors.muted} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt style={{ fontWeight: '600' }}>Acompanhamento do cliente</Txt>
          <Txt style={common.caption}>
            {sentAt
              ? `Link pessoal enviado para ${request.email} em ${sentAt}. O cliente acompanha cada etapa sem ver dados internos.`
              : 'O link de acompanhamento ainda não foi enviado para este pedido.'}
          </Txt>
        </View>
      </View>
      {confirming ? (
        <View style={styles.followUpActions}>
          <Txt style={[common.caption, { flex: 1 }]}>Enviar um novo link para {request.email}? O anterior deixará de valer.</Txt>
          <Button variant="secondary" disabled={busy} onPress={() => setConfirming(false)}>Cancelar</Button>
          <Button icon={Send} loading={busy} onPress={() => void onSend().finally(() => setConfirming(false))}>Confirmar envio</Button>
        </View>
      ) : (
        <View style={styles.followUpActions}>
          <Button variant="secondary" icon={Send} disabled={busy} onPress={() => setConfirming(true)}>
            {sentAt ? 'Reenviar link' : 'Enviar link'}
          </Button>
        </View>
      )}
    </View>
  );
}
