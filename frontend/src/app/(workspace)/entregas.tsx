import { Redirect } from 'expo-router';
import { DeliveriesScreen } from '@/features/deliveries/deliveries-screen';
import { useSession } from '@/features/auth/session';

export default function DeliveriesRoute() {
  const { session } = useSession();
  return session?.role !== 'hr' ? <DeliveriesScreen /> : <Redirect href="/dashboard" />;
}
