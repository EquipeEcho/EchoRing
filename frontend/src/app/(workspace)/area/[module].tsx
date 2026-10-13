import { Redirect, useLocalSearchParams } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { AreaScreen } from '@/features/workspace/screens/area-screen';

export default function AreaRoute() {
  const { session } = useSession();
  const { module } = useLocalSearchParams<{ module: string }>();
  const allowed =
    session?.role === 'admin' ||
    (session?.role === 'employee' && module !== 'administracao') ||
    (session?.role === 'hr' && module === 'cadastros');
  return allowed ? <AreaScreen /> : <Redirect href="/dashboard" />;
}
