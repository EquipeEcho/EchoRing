import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Inbox, UserPlus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
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
  const { session } = useSession();
  const { module } = useLocalSearchParams<{ module: string }>();
  const area = modules.find((item) => item.href === '/area/' + module);
  const canRegisterClients =
    module === 'cadastros' && (session?.role === 'admin' || session?.role === 'employee');
  const openClientRegistration = () => router.push('/clientes/cadastrar');
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
        action={
          canRegisterClients ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Button variant="secondary" onPress={() => router.push('/clientes')}>
                Ver clientes
              </Button>
              <Button icon={UserPlus} onPress={openClientRegistration}>
                Cadastrar cliente
              </Button>
            </View>
          ) : (
            <Badge tone="neutral">Em preparação</Badge>
          )
        }
      />
      <View style={styles.areaIntro}>
        <View style={styles.areaSymbol}>
          <area.icon size={28} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Txt style={styles.areaStatus}>
            {canRegisterClients ? 'CLIENTES DISPONÍVEIS' : 'PRÓXIMO MÓDULO'}
          </Txt>
          <Txt style={styles.areaTitle}>
            {canRegisterClients
              ? 'Cadastre e consulte os clientes da empresa.'
              : `A estrutura de ${area.title.toLocaleLowerCase('pt-BR')} já está mapeada.`}
          </Txt>
          <Txt style={common.caption}>
            {canRegisterClients
              ? 'Consulte os dados de contato dos clientes cadastrados em um só lugar.'
              : 'As seções abaixo serão ativadas conforme os próximos fluxos da operação forem integrados.'}
          </Txt>
        </View>
      </View>
      <View style={styles.areaDirectory}>
        <View style={styles.agendaHead}>
          <Txt style={styles.listEyebrow}>
            {canRegisterClients ? 'SEÇÕES' : 'SEÇÕES PLANEJADAS'}
          </Txt>
          <Txt style={common.caption}>{(areaItems[module] ?? []).length} itens</Txt>
        </View>
        {(areaItems[module] ?? []).map((title, index) => {
          const isClientRegistration = canRegisterClients && title === 'Clientes';
          const contents = (
            <>
              <Txt style={styles.areaNumber}>{String(index + 1).padStart(2, '0')}</Txt>
              <Txt style={styles.areaItemTitle}>{title}</Txt>
              <ArrowRight size={15} color={colors.muted} />
            </>
          );
          return isClientRegistration ? (
            <Pressable
              key={title}
              accessibilityRole="button"
              accessibilityLabel="Clientes"
              onPress={openClientRegistration}
              style={({ pressed }) => [styles.areaItem, pressed && { opacity: 0.75 }]}
            >
              {contents}
            </Pressable>
          ) : (
            <View key={title} style={styles.areaItem}>
              {contents}
            </View>
          );
        })}
      </View>
    </WorkspacePage>
  );
}
