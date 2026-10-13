export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSelectedDate(value: string) {
  const date = dateFromValue(value);
  return date
    ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : value;
}
