import { type Href, router } from 'expo-router';
import { ArrowLeft, FileSearch, RefreshCw } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Txt } from '@/components/ui/text';
import { WorkspacePage } from '@/features/workspace/components/workspace-page';
import { useTheme } from '@/theme/theme-context';

type Props = {
  title: string;
  eyebrow?: string;
  description?: string;
  backLabel: string;
  backHref: Href;
  onBack?: () => void;
  busy?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  children?: ReactNode;
};

export function RecordPage({ title, eyebrow, description, backLabel, backHref, onBack,
  busy, loading, error, onRetry, children }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  return <WorkspacePage showProjectStatus={false}>
    <View testID="record-page" style={{ gap: 24, minWidth: 0 }}>
      <View style={{ alignItems: 'flex-start', gap: 18 }}>
        <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          <Button variant="ghost" icon={ArrowLeft} disabled={busy} onPress={onBack ?? (() => router.replace(backHref))}>
            {backLabel}
          </Button>
          {!loading && !error && onRetry && <Button variant="secondary" icon={RefreshCw} disabled={busy} onPress={onRetry}>Atualizar detalhes</Button>}
        </View>
        <View style={{ gap: 8, maxWidth: '100%' }}>
          {!!eyebrow && <Txt style={{ fontSize: 12, letterSpacing: 1, fontWeight: '600', color: colors.accent }}>{eyebrow}</Txt>}
          <Txt accessibilityRole="header" style={{ fontSize: width < 700 ? 26 : 32, lineHeight: width < 700 ? 34 : 40, letterSpacing: -0.8, fontWeight: '700' }}>{title}</Txt>
          {!!description && <Txt style={{ fontSize: 14, lineHeight: 22, color: colors.muted }}>{description}</Txt>}
        </View>
      </View>
      {loading ? <ActivityIndicator accessibilityLabel="Carregando detalhes do trabalho" color={colors.accent} />
        : error ? <EmptyState icon={FileSearch} title="Não foi possível abrir este registro" text={error}
          action={onRetry ? <Button variant="secondary" onPress={onRetry}>Tentar novamente</Button> : undefined} />
          : <View testID="record-content" style={{ gap: 24, minWidth: 0, padding: width < 700 ? 16 : 24,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16 }}>{children}</View>}
    </View>
  </WorkspacePage>;
}
