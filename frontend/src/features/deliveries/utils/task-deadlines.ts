import { type ServiceStatus, type TranslationService } from '@/features/deliveries/types';
import { byNearestDeadline, deadlineAlert, type DeadlineAlert } from '@/utils/deadlines';

/** Statuses where the translator still owes work; once submitted, the deadline is the team's concern. */
const translatorOwesWork: ServiceStatus[] = ['Tradutor atribuído', 'Em andamento', 'Revisão solicitada'];

/** Task deadlines may be ISO dates or `dd/mm/aaaa` from older assignments; both become `YYYY-MM-DD`. */
export function taskDeadline(task: Pick<TranslationService, 'deadline'>) {
  const brazilian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(task.deadline ?? '');
  return brazilian ? `${brazilian[3]}-${brazilian[2]}-${brazilian[1]}` : task.deadline;
}

export function taskDeadlineAlert(task: TranslationService, now = Date.now()): DeadlineAlert | null {
  return translatorOwesWork.includes(task.status) ? deadlineAlert(taskDeadline(task), now) : null;
}

const byDeadline = byNearestDeadline<TranslationService>(taskDeadline);

/** Work the translator still owes comes first, nearest deadline first; undated tasks keep their order. */
export function byTaskUrgency(first: TranslationService, second: TranslationService) {
  const owed = Number(translatorOwesWork.includes(second.status)) - Number(translatorOwesWork.includes(first.status));
  return owed || byDeadline(first, second);
}
