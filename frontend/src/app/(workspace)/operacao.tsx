import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { OperationsScreen } from '@/features/workspace/screens/operations-screen';

export default function OperationsRoute() {
  const { session } = useSession();
  return session?.role !== 'hr' ? <OperationsScreen /> : <Redirect href="/dashboard" />;
}
