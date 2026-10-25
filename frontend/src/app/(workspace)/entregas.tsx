import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { DeliveriesScreen } from '@/features/deliveries/screens/deliveries-screen';

export default function DeliveriesRoute() {
  const { session } = useSession();
  return session?.role !== 'hr' ? <DeliveriesScreen /> : <Redirect href="/dashboard" />;
}
