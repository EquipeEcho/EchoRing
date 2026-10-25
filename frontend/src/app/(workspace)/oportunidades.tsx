import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/contexts/session-context';
import { OpportunitiesScreen } from '@/features/offers/screens/opportunities-screen';

export default function OpportunitiesRoute() {
  const { session } = useSession();
  return session?.role === 'translator' ? <OpportunitiesScreen /> : <Redirect href="/dashboard" />;
}
