import { Redirect, useLocalSearchParams } from 'expo-router';
import { AreaScreen } from '@/features/workspace/screens';
import { useSession } from '@/features/auth/session';

export default function AreaRoute() {
  const { session } = useSession();
  const { module } = useLocalSearchParams<{ module: string }>();
  const allowed = session?.role === 'admin'
    || (session?.role === 'employee' && module !== 'administracao')
    || (session?.role === 'hr' && module === 'cadastros');
  return allowed ? <AreaScreen /> : <Redirect href="/dashboard" />;
}
