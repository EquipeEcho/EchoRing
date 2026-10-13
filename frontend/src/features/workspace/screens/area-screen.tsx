import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Inbox } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { WorkspacePage } from '@/features/workspace/components/workspace-page';
import { areaItems } from '@/features/workspace/constants/areas';
import { modules } from '@/features/workspace/navigation/modules';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function AreaScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { module } = useLocalSearchParams<{ module: string }>();
  const area = modules.find((item) => item.href === '/area/' + module);
  if (!area)
    return (
      <WorkspacePage>
        <EmptyState
          icon={Inbox}
          title="Área não encontrada"
          text="Esta área não está disponível."
          action={<Button onPress={() => router.replace('/dashboard')}>Voltar ao início</Button>}
        />
      </WorkspacePage>
    );
  return (
    <WorkspacePage>
      <PageHeading
        title={area.title}
        subtitle={area.description}
        action={<Badge tone="neutral">Em preparação</Badge>}
      />
      <View style={styles.areaIntro}>
        <View style={styles.areaSymbol}>
          <area.icon size={28} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Txt style={styles.areaStatus}>PRÓXIMO MÓDULO</Txt>
          <Txt style={styles.areaTitle}>
            A estrutura de {area.title.toLocaleLowerCase('pt-BR')} já está mapeada.
          </Txt>
          <Txt style={common.caption}>
            As seções abaixo serão ativadas conforme os próximos fluxos da operação forem
            integrados.
          </Txt>
        </View>
      </View>
      <View style={styles.areaDirectory}>
        <View style={styles.agendaHead}>
          <Txt style={styles.listEyebrow}>SEÇÕES PLANEJADAS</Txt>
          <Txt style={common.caption}>{(areaItems[module] ?? []).length} itens</Txt>
        </View>
        {(areaItems[module] ?? []).map((title, index) => (
          <View key={title} style={styles.areaItem}>
            <Txt style={styles.areaNumber}>{String(index + 1).padStart(2, '0')}</Txt>
            <Txt style={styles.areaItemTitle}>{title}</Txt>
            <ArrowRight size={15} color={colors.muted} />
          </View>
        ))}
      </View>
    </WorkspacePage>
  );
}
