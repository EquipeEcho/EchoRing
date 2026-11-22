import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { FinanceScreen } from '@/features/finance/screens/finance-screen';

export default function FinanceRoute() {
  const { session } = useSession();
  return session?.role === 'admin' ? <FinanceScreen /> : <Redirect href="/dashboard" />;
}
