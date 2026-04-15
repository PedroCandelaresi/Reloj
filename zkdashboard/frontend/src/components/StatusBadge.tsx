import { STATUS_LABELS } from '@/lib/api';

const colors: Record<number, string> = {
  0: 'bg-green-100 text-green-700',
  1: 'bg-red-100 text-red-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-blue-100 text-blue-700',
  5: 'bg-blue-100 text-blue-700',
};

export function StatusBadge({ status }: { status: number }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
