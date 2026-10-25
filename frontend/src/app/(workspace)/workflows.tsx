import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { WorkflowsScreen } from '@/features/workflows/screens/workflows-screen';

export default function WorkflowsRoute() {
  const { session } = useSession();
  if (!session || !['translator', 'employee', 'admin'].includes(session.role)) return <Redirect href="/dashboard" />;
  return <WorkflowsScreen />;
}
