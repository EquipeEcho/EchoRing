import { WorkspaceShell } from '@/components/layout/workspace-shell';
import { WorkspaceProvider } from '@/features/workspace/data';

export default function WorkspaceLayout() {
  return <WorkspaceProvider><WorkspaceShell /></WorkspaceProvider>;
}
