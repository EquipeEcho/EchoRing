/** Keep API decimals independent from Brazilian display separators. */
export function currencyToDecimal(value: string): string {
  const cleaned = value.replace(/R\$|\s/g, '');
  if (!cleaned || /[^\d.,]/.test(cleaned)) return '';
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(cleaned) ? cleaned.replace(/\./g, '') : cleaned;
  if (!/^\d{1,10}(\.\d{0,2})?$/.test(normalized)) return '';
  const [integer, decimal = ''] = normalized.split('.');
  return `${integer.replace(/^0+(?=\d)/, '')}.${decimal.padEnd(2, '0')}`;
}

export function formatCurrencyInput(value: string): string {
  const cleaned = value.replace(/R\$|\s/g, '');
  const truncated = cleaned.includes(',') ? cleaned.replace(/(,\d{2})\d+$/, '$1') : cleaned;
  const decimal = currencyToDecimal(truncated);
  if (!decimal) return '';
  const [integer, cents] = decimal.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const separator = truncated.includes(',') ? ',' : /\.\d{0,2}$/.test(truncated) ? '.' : '';
  return separator ? `${grouped},${cents.slice(0, truncated.length - truncated.lastIndexOf(separator) - 1)}` : grouped;
}

export function currencyInputFromDecimal(value: string): string {
  const decimal = currencyToDecimal(value);
  if (!decimal) return '';
  const [integer, cents] = decimal.split('.');
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`;
}

export function formatPhoneInput(value: string): string {
  const international = value.trimStart().startsWith('+') || /^55\d{10,11}$/.test(value.replace(/\D/g, ''));
  const digits = value.replace(/\D/g, '').slice(0, international ? 15 : 11);
  if (!digits) return international ? '+' : '';
  if (international && !digits.startsWith('55')) return '+' + digits;
  const prefix = international ? '+55 ' : '';
  const local = international ? digits.slice(2, 13) : digits;
  if (international && digits.length < 2) return '+' + digits;
  if (!local) return prefix.trimEnd();
  if (local.length <= 2) return `${prefix}(${local}`;
  const subscriber = local.slice(2), split = subscriber.length > 8 ? 5 : 4;
  return `${prefix}(${local.slice(0, 2)}) ${subscriber.slice(0, split)}${subscriber.length > split ? '-' + subscriber.slice(split) : ''}`;
}
