import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/session';
import { WorkspaceShell } from '@/components/layout/workspace-shell';
import { InboxProvider } from '@/features/requests/inbox';
import { WorkspaceProvider } from '@/features/workspace/data';

export default function WorkspaceLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/login" />;
  return <InboxProvider><WorkspaceProvider><WorkspaceShell /></WorkspaceProvider></InboxProvider>;
}
