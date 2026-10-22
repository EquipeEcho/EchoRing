import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { ManualClientScreen } from '@/features/requests/screens/manual-client-screen';

export default function ManualClientRoute() {
  const { session } = useSession();
  return session?.role === 'employee' || session?.role === 'admin' ? (
    <ManualClientScreen />
  ) : (
    <Redirect href="/dashboard" />
  );
}
