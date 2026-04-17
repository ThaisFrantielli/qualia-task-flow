// Centralized date formatting utilities — always render in São Paulo (GMT-3)
// to avoid the lag observed in ticket cards/headers when the browser
// defaults to UTC or another timezone.

const TZ = 'America/Sao_Paulo';

const parseDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // Postgres "YYYY-MM-DD HH:MM:SS" without TZ → assume UTC
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
    const d = new Date(value.replace(' ', 'T') + 'Z');
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const buildFormatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...options });

const fmtDateTime = buildFormatter({
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const fmtDate = buildFormatter({
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const fmtTime = buildFormatter({
  hour: '2-digit',
  minute: '2-digit',
});

const fmtShortDateTime = buildFormatter({
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** dd/MM/yyyy HH:mm in São Paulo timezone */
export const formatDateTimeBR = (value: string | Date | null | undefined): string => {
  const d = parseDate(value);
  if (!d) return '';
  return fmtDateTime.format(d).replace(',', '');
};

/** dd/MM/yyyy in São Paulo timezone */
export const formatDateBR = (value: string | Date | null | undefined): string => {
  const d = parseDate(value);
  if (!d) return '';
  return fmtDate.format(d);
};

/** HH:mm in São Paulo timezone */
export const formatTimeBR = (value: string | Date | null | undefined): string => {
  const d = parseDate(value);
  if (!d) return '';
  return fmtTime.format(d);
};

/** dd/MM HH:mm in São Paulo timezone */
export const formatShortDateTimeBR = (value: string | Date | null | undefined): string => {
  const d = parseDate(value);
  if (!d) return '';
  return fmtShortDateTime.format(d).replace(',', '');
};

/** Returns Hoje / Ontem / dd/MM/yyyy in São Paulo timezone */
export const formatRelativeDateBR = (value: string | Date | null | undefined): string => {
  const d = parseDate(value);
  if (!d) return '';
  const today = new Date();
  const todayKey = fmtDate.format(today);
  const valueKey = fmtDate.format(d);
  if (todayKey === valueKey) return 'Hoje';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (fmtDate.format(yesterday) === valueKey) return 'Ontem';
  return valueKey;
};
