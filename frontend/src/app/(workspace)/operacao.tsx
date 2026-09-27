import { Redirect } from 'expo-router';
import { OperationsScreen } from '@/features/workspace/screens';
import { useSession } from '@/features/auth/session';

export default function OperationsRoute() {
  const { session } = useSession();
  return session?.role !== 'hr' ? <OperationsScreen /> : <Redirect href="/dashboard" />;
}
