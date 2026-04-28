import { formatEmployeeName, type IncompleteReason, type MonthlySummaryStatus } from '@/lib/api';
import {
  ARGENTINA_TIMEZONE,
  formatArgentinaDateTime,
  formatArgentinaTime,
} from '@/lib/argentina-date';

export const TZ = ARGENTINA_TIMEZONE;

export function formatReportEmployee(employee: {
  nombre?: string | null;
  apellido?: string | null;
}, userId: string) {
  return formatEmployeeName(employee) ?? userId;
}

export function formatDateTime(iso?: string | null) {
  return formatArgentinaDateTime(iso);
}

export function formatTime(iso: string) {
  return formatArgentinaTime(iso);
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, '0')}m`;
}

export function statusLabel(status: MonthlySummaryStatus) {
  switch (status) {
    case 'present':
      return 'Presente';
    case 'calculated':
      return 'Calculado';
    case 'incomplete':
      return 'Incompleto';
    case 'no_records':
      return 'Sin fichadas';
    case 'absent':
      return 'Ausente';
    case 'holiday':
      return 'Feriado';
    case 'weekend':
      return 'Fin de semana';
    case 'needs_review':
      return 'Revisar';
    case 'justified':
      return 'Justificado';
  }
}

export function statusClassName(status: MonthlySummaryStatus) {
  switch (status) {
    case 'present':
    case 'calculated':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
    case 'incomplete':
    case 'needs_review':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'justified':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
    case 'absent':
      return 'bg-red-500/10 text-red-700 dark:text-red-300';
    case 'holiday':
      return 'bg-sky-500/10 text-sky-700 dark:text-sky-300';
    case 'weekend':
      return 'bg-violet-500/10 text-violet-700 dark:text-violet-300';
    case 'no_records':
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-300';
  }
}

export function reasonLabel(reason: IncompleteReason) {
  switch (reason) {
    case 'single_punch':
      return 'Una sola fichada';
    case 'odd_punch_count':
      return 'Cantidad impar';
    case 'missing_exit':
      return 'Salida faltante';
    case 'missing_entry_unknown':
      return 'Entrada no identificada';
  }
}
