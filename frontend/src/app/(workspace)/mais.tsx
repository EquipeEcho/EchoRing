import { Redirect } from 'expo-router';
import { MoreScreen } from '@/features/workspace/screens';
import { useSession } from '@/features/auth/session';

export default function MoreRoute() {
  const { session } = useSession();
  return session?.role !== 'translator' ? <MoreScreen /> : <Redirect href="/dashboard" />;
}
