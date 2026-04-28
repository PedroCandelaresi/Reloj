import { STATUS_LABELS } from '@/lib/format-employee';

const colors: Record<number, string> = {
  0: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  1: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  2: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  3: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  4: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  5: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
};

export function StatusBadge({ status, label }: { status: number; label?: string | null }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}
