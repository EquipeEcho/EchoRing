import { router } from 'expo-router';
import { UserPlus, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { listClients } from '@/features/clients/services/client-service';
import { type Client } from '@/features/clients/types';
import { useCommonStyles } from '@/theme/common.styles';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
}

export function ClientsListScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { session } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      setClients(await listClients(session));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const registerButton = (
    <Button icon={UserPlus} onPress={() => router.push('/clientes/cadastrar')}>
      Cadastrar cliente
    </Button>
  );

  return (
    <View style={styles.page}>
      <PageHeading
        title="Clientes"
        subtitle="Clientes cadastrados na plataforma."
        action={registerButton}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Txt accessibilityRole="alert" style={styles.error}>
            {error}
          </Txt>
          <Button variant="secondary" onPress={() => void load()}>
            Tentar novamente
          </Button>
        </View>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado"
          text="Cadastre o primeiro cliente para vê-lo aqui."
          action={registerButton}
        />
      ) : (
        <View style={styles.list}>
          <Txt style={common.caption}>
            {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
          </Txt>
          {clients.map((client) => (
            <View key={client.id} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={styles.name}>{client.name}</Txt>
                <Txt style={common.caption}>{client.email}</Txt>
                {client.company ? <Txt style={common.caption}>{client.company}</Txt> : null}
              </View>
              <Txt style={common.caption}>{formatDate(client.createdAt)}</Txt>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  page: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  center: { alignItems: 'center', gap: 14, paddingVertical: 44 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  name: { fontSize: 16, fontWeight: '600' },
  error: {
    color: colors.red,
    fontSize: 13,
    lineHeight: 20,
    padding: 12,
    backgroundColor: colors.redSoft,
    borderRadius: 10,
  },
}));
