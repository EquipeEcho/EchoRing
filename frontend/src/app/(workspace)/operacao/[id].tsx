import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/contexts/session-context';
import { ProjectDetailsScreen } from '@/features/workspace/screens/project-details-screen';

export default function ProjectRoute() {
  const { session } = useSession();
  return session?.role !== 'hr' ? <ProjectDetailsScreen /> : <Redirect href="/dashboard" />;
}
