import { type FinanceOverview } from '@/features/finance/types';
import { api } from '@/lib/api/client';

export function getFinanceOverview(token: string) {
  return api<FinanceOverview>('/finance/overview', {}, token);
}
