import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { ClientsListScreen } from '@/features/clients/screens/clients-list-screen';

export default function ClientsRoute() {
  const { session } = useSession();
  return session?.role === 'employee' || session?.role === 'admin' ? (
    <ClientsListScreen />
  ) : (
    <Redirect href="/dashboard" />
  );
}
