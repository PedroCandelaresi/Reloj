export const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayArgentinaDateKey() {
  const parts = dateKeyFormatter.formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

export function currentArgentinaPeriod() {
  const [year, month] = todayArgentinaDateKey().split('-');
  return { year, month: String(Number(month)) };
}

export function formatArgentinaDate(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatArgentinaDateTime(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatArgentinaTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
