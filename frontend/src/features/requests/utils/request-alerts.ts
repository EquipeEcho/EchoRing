import { type RequestStatus, type TranslationRequest } from '@/features/requests/types';
import { requestTasks } from '@/features/requests/utils/quote-scope';

/** Same thresholds as `backend/app/core/request_alerts.py`; keep both in sync. */
export const alertRules = {
  staleAnalysisDays: 2,
  quoteReminderDays: 3,
  linkExpiryWarningDays: 3,
  deadlineWarningDays: 1,
};

export type RequestAlert = { kind: 'analise' | 'resposta' | 'link' | 'prazo'; tone: 'amber' | 'red'; label: string };

const day = 86400000;
const closedStatuses: RequestStatus[] = ['Pronta', 'Entregue', 'Orçamento recusado'];
const preQuoteStatuses: RequestStatus[] = ['Recebido', 'Em análise'];
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const days = (count: number) => `${count} ${count === 1 ? 'dia' : 'dias'}`;

/** Today's date in São Paulo as `YYYY-MM-DD`, the format used by date-only deadlines. */
export function saoPauloToday(now: number) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

function daysFrom(from: string, to: string) {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / day);
}

function elapsedDays(value: string | undefined, now: number) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? Math.floor((now - time) / day) : null;
}

/** Earliest open task deadline, then the promised delivery, then the date the client asked for. */
export function nextDeadline(request: TranslationRequest) {
  const task = requestTasks(request)
    .filter(item => item.status !== 'Entregue' && isoDate.test(item.deadline ?? ''))
    .map(item => item.deadline)
    .sort()[0];
  if (task) return task;
  const beforeQuote = preQuoteStatuses.includes(request.status);
  const delivery = request.quote?.delivery ?? '';
  if (!beforeQuote && isoDate.test(delivery)) return delivery;
  if (beforeQuote && isoDate.test(request.deadline)) return request.deadline;
  return undefined;
}

/** Reasons a request needs the team now; free-text dates such as "5 dias úteis" never raise alerts. */
export function requestAlerts(request: TranslationRequest, now = Date.now()): RequestAlert[] {
  const alerts: RequestAlert[] = [];
  const waitingAnalysis = elapsedDays(request.createdAt, now);
  if (request.status === 'Recebido' && waitingAnalysis !== null && waitingAnalysis >= alertRules.staleAnalysisDays) {
    alerts.push({ kind: 'analise', tone: 'amber', label: `Aguardando análise há ${days(waitingAnalysis)}` });
  }
  if (request.status === 'Orçamento enviado') {
    const unanswered = elapsedDays(request.emailSentAt, now);
    if (unanswered !== null && unanswered >= alertRules.quoteReminderDays) {
      alerts.push({ kind: 'resposta', tone: 'amber', label: `Sem resposta há ${days(unanswered)}` });
    }
    const expires = request.quoteExpiresAt ? Date.parse(request.quoteExpiresAt) : NaN;
    if (Number.isFinite(expires) && expires <= now) {
      alerts.push({ kind: 'link', tone: 'red', label: 'Link do orçamento expirou' });
    } else if (Number.isFinite(expires) && expires - now <= alertRules.linkExpiryWarningDays * day) {
      alerts.push({ kind: 'link', tone: 'amber', label: `Link expira em ${days(Math.ceil((expires - now) / day))}` });
    }
  }
  const deadline = closedStatuses.includes(request.status) ? undefined : nextDeadline(request);
  if (deadline) {
    const left = daysFrom(saoPauloToday(now), deadline);
    if (left < 0) alerts.push({ kind: 'prazo', tone: 'red', label: `Atrasado há ${days(-left)}` });
    else if (left === 0) alerts.push({ kind: 'prazo', tone: 'amber', label: 'Prazo vence hoje' });
    else if (left <= alertRules.deadlineWarningDays) alerts.push({ kind: 'prazo', tone: 'amber', label: 'Prazo vence amanhã' });
  }
  return alerts;
}
