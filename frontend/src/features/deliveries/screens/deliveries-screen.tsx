import { useSession } from '@/features/auth/contexts/session-context';
import { StaffReviewsScreen } from '@/features/deliveries/screens/staff-reviews-screen';
import { TranslatorTasksScreen } from '@/features/deliveries/screens/translator-tasks-screen';

export function DeliveriesScreen() {
  const { session } = useSession();
  return session?.role === 'translator' ? <TranslatorTasksScreen /> : <StaffReviewsScreen />;
}
