import Link from 'next/link';
import type { ReactNode } from 'react';

export function CompanyRequiredMessage({ reportName, children }: { reportName: string; children?: ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
      <div className="card rounded-xl p-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {reportName}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Para usar esta sección como super admin, primero seleccioná una empresa.
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Los datos de asistencia, solicitudes, feriados y reportes pertenecen a una empresa específica.
        </p>
        {children}
        <Link
          href="/admin/companies"
          className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Ir a empresas
        </Link>
      </div>
    </main>
  );
}
