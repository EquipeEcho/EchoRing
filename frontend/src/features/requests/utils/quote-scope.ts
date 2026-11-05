import { type Intake, type QuoteItem, type TranslationRequest } from '@/features/requests/types';
import { currencyToDecimal } from '@/utils/input-formatters';

export const requestTargets = (request: Pick<Intake, 'target' | 'targets'>) => request.targets?.length ? request.targets : [request.target];
export const workTargets = (request: TranslationRequest) => request.approvedTargets ?? requestTargets(request);
export const requestTasks = (request: TranslationRequest) => request.tasks ?? (request.task ? [request.task] : []);

/** Sum in cents so the commercial total matches the server's decimal arithmetic. */
export function quoteTotal(items: QuoteItem[]) {
  return (items.reduce((total, item) => total + Math.round(Number(currencyToDecimal(item.amount) || '0') * 100), 0) / 100).toFixed(2);
}
