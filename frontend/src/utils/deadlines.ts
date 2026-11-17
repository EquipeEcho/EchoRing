/** Deadline rules shared by staff alerts and the translator's screens; dates follow São Paulo days. */

export type DeadlineAlert = { tone: 'amber' | 'red'; label: string };

const day = 86400000;
const hour = 3600000;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const days = (count: number) => `${count} ${count === 1 ? 'dia' : 'dias'}`;

export const isIsoDate = (value?: string | null): value is string => !!value && isoDate.test(value);

/** Today's date in São Paulo as `YYYY-MM-DD`, the format used by date-only deadlines. */
export function saoPauloToday(now: number) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

/** Calendar days from today to a `YYYY-MM-DD` date; negative when it already passed. */
export function daysUntil(date: string, now: number) {
  return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(saoPauloToday(now) + 'T00:00:00Z')) / day);
}

/** Overdue, due today or due within `warningDays`; free-text dates such as "5 dias úteis" never warn. */
export function deadlineAlert(date: string | null | undefined, now: number, warningDays = 1): DeadlineAlert | null {
  if (!isIsoDate(date)) return null;
  const left = daysUntil(date, now);
  if (left < 0) return { tone: 'red', label: `Atrasado há ${days(-left)}` };
  if (left === 0) return { tone: 'amber', label: 'Prazo vence hoje' };
  if (left > warningDays) return null;
  return { tone: 'amber', label: left === 1 ? 'Prazo vence amanhã' : `Prazo vence em ${days(left)}` };
}

/** How long is left to answer something that expires at an exact time, such as an offer. */
export function responseAlert(expiresAt: string | null | undefined, now: number, warningHours = 24): DeadlineAlert | null {
  const time = expiresAt ? Date.parse(expiresAt) : NaN;
  if (!Number.isFinite(time)) return null;
  const left = time - now;
  if (left <= 0) return { tone: 'red', label: 'Prazo de resposta encerrado' };
  if (left > warningHours * hour) return null;
  const hours = Math.max(1, Math.ceil(left / hour));
  return { tone: hours <= 3 ? 'red' : 'amber', label: `Responda em até ${hours} h` };
}

/** Orders by the nearest ISO deadline; items without one keep their order at the end. */
export function byNearestDeadline<T>(deadlineOf: (item: T) => string | null | undefined) {
  return (first: T, second: T) => {
    const a = deadlineOf(first);
    const b = deadlineOf(second);
    if (isIsoDate(a) && isIsoDate(b)) return a.localeCompare(b);
    return Number(isIsoDate(b)) - Number(isIsoDate(a));
  };
}
