'use client';

import { humanizeActionError } from '@/lib/ux-labels';

export default function ReportsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
      <div className="card rounded-xl p-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          No se pudo cargar el reporte
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {humanizeActionError(error.message)}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
