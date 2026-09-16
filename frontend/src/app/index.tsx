import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/session';

export default function IndexScreen() {
  const { session } = useSession();
  return <Redirect href={session ? '/dashboard' : '/login'} />;
}
