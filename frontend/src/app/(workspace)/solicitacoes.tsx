import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { RequestsScreen } from '@/features/requests/screens/requests-screen';

export default function RequestsRoute() {
  const { session } = useSession();
  return session?.role === 'employee' || session?.role === 'admin' ? (
    <RequestsScreen />
  ) : (
    <Redirect href="/dashboard" />
  );
}
