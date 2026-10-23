import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { useTheme } from '@/theme/theme-context';

import { useStyles } from '@/features/workspace/styles/workspace.styles';

export function WorkspacePage({ children, showProjectStatus = true }: { children: React.ReactNode; showProjectStatus?: boolean }) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { loading, loadError, refresh } = useWorkspace();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.page, width < 700 && { padding: 20, paddingTop: 26 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.pageInner}>
        {showProjectStatus && loading && <View style={[styles.welcomeNote, { flexDirection: 'row', alignItems: 'center' }]}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Txt accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 13 }}>Atualizando seus projetos e tarefas…</Txt>
        </View>}
        {showProjectStatus && !!loadError && <View style={[styles.welcomeNote, { borderColor: colors.red }]}>
          <Txt accessibilityRole="alert" style={{ color: colors.red }}>{loadError}</Txt>
          <Txt style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>Seus dados não foram atualizados. Tente novamente para consultar a situação atual.</Txt>
          <Button variant="secondary" onPress={refresh}>Tentar novamente</Button>
        </View>}
        {children}
      </View>
    </ScrollView>
  );
}
