import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/session';
import { UsersScreen } from '@/features/users/users-screen';

export default function UsersRoute() {
  const { session } = useSession();
  return session?.role === 'admin' ? <UsersScreen /> : <Redirect href="/dashboard" />;
}
