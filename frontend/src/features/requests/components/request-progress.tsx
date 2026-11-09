import { Check, X } from 'lucide-react-native';
import { useWindowDimensions, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/requests/styles/requests.styles';
import { type TranslationRequest } from '@/features/requests/types';
import { type ProgressStep, requestProgress } from '@/features/requests/utils/request-progress';
import { useTheme } from '@/theme/theme-context';
import { breakpoints } from '@/theme/tokens';

const stateLabel: Record<ProgressStep['state'], string> = {
  done: 'concluída',
  current: 'etapa atual',
  pending: 'pendente',
  refused: 'recusada',
};

const formatAt = (value: string) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export function RequestProgress({ request }: { request: TranslationRequest }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const vertical = width < breakpoints.compact;
  const progress = requestProgress(request);
  return (
    <View
      role="list"
      accessibilityLabel="Andamento da solicitação"
      style={[styles.progress, vertical && styles.progressVertical]}
    >
      {progress.map((step, index) => {
        const last = index === progress.length - 1;
        return (
          <View
            key={step.key}
            role="listitem"
            aria-current={step.state === 'current' ? 'step' : undefined}
            accessibilityLabel={`Etapa ${index + 1} de ${progress.length}: ${step.label}, ${stateLabel[step.state]}${step.at ? ` em ${formatAt(step.at)}` : ''}`}
            style={[styles.progressStep, vertical ? styles.progressStepVertical : styles.progressStepHorizontal]}
          >
            <View style={[styles.progressTrack, vertical && styles.progressTrackVertical]}>
              <View
                style={[
                  styles.progressMarker,
                  step.state === 'done' && styles.progressMarkerDone,
                  step.state === 'current' && styles.progressMarkerCurrent,
                  step.state === 'refused' && styles.progressMarkerRefused,
                ]}
              >
                {step.state === 'done' && <Check size={14} color={colors.onAccent} strokeWidth={3} />}
                {step.state === 'refused' && <X size={14} color={colors.onAccent} strokeWidth={3} />}
                {step.state === 'current' && <View style={styles.progressPulse} />}
              </View>
              {!last && (
                <View
                  style={[
                    styles.progressLine,
                    vertical ? styles.progressLineVertical : styles.progressLineHorizontal,
                    step.state === 'done' && progress[index + 1].state !== 'pending' && styles.progressLineDone,
                  ]}
                />
              )}
            </View>
            <View style={[styles.progressCopy, vertical && styles.progressCopyVertical]}>
              <Txt style={[styles.progressLabel, step.state === 'pending' && styles.progressLabelPending]}>
                {step.state === 'refused' ? 'Recusado' : step.label}
              </Txt>
              <Txt style={styles.progressMeta}>
                {step.at ? formatAt(step.at) : step.state === 'current' ? 'Em andamento' : ' '}
              </Txt>
            </View>
          </View>
        );
      })}
    </View>
  );
}
