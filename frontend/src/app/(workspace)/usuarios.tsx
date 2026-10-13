import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { UsersScreen } from '@/features/users/screens/users-screen';

export default function UsersRoute() {
  const { session } = useSession();
  return session?.role === 'admin' ? <UsersScreen /> : <Redirect href="/dashboard" />;
}
