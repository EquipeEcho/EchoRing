import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/contexts/session-context';
import { NewRequestScreen } from '@/features/workspace/screens/new-request-screen';

export default function NewRequestRoute() {
  const { session } = useSession();
  return session?.role === 'employee' || session?.role === 'admin' ? <NewRequestScreen /> : <Redirect href="/dashboard" />;
}
