import { Redirect } from 'expo-router';
import { RequestsScreen } from '@/features/requests/requests-screen';
import { useSession } from '@/features/auth/session';

export default function RequestsRoute() {
  const { session } = useSession();
  return session?.role === 'employee' || session?.role === 'admin' ? <RequestsScreen /> : <Redirect href="/dashboard" />;
}
