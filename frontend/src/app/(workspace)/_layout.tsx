import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { InboxProvider } from '@/features/requests/contexts/inbox-context';
import { WorkspaceProvider } from '@/features/workspace/contexts/workspace-context';
import { WorkspaceShell } from '@/features/workspace/layout/workspace-shell';

export default function WorkspaceLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/login" />;
  return (
    <InboxProvider>
      <WorkspaceProvider>
        <WorkspaceShell />
      </WorkspaceProvider>
    </InboxProvider>
  );
}
