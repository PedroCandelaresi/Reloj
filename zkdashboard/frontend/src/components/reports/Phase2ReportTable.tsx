import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Phase2ReportRow } from '@/lib/api';
import { formatArgentinaDateTime } from '@/lib/argentina-date';
import { formatEmployeeName } from '@/lib/format-employee';

export function Phase2ReportTable({
  rows,
  emptyMessage,
  mode,
  canCreateRequests = false,
}: {
  rows: Phase2ReportRow[];
  emptyMessage: string;
  mode: 'late' | 'early' | 'absences' | 'worked';
  canCreateRequests?: boolean;
}) {
  return (
    <div className="card rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="px-6 py-4 text-left font-semibold">Empleado</th>
              <th className="px-6 py-4 text-left font-semibold">Fecha</th>
              <th className="px-6 py-4 text-left font-semibold">Esperado</th>
              <th className="px-6 py-4 text-left font-semibold">Fichadas</th>
              <th className="px-6 py-4 text-left font-semibold">Tardanza</th>
              <th className="px-6 py-4 text-left font-semibold">Salida temprana</th>
              <th className="px-6 py-4 text-left font-semibold">Trabajado</th>
              <th className="px-6 py-4 text-left font-semibold">Estado</th>
              {canCreateRequests && <th className="px-6 py-4 text-left font-semibold">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canCreateRequests ? 9 : 8} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.employeeId}-${row.date}-${mode}`} className="table-row">
                  <td className="px-6 py-4">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatEmployeeName(row.employee) ?? row.employeeId}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{row.employeeId}</div>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.date}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                    {row.expectedEntryTime ?? '-'} / {row.expectedExitTime ?? '-'}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                    {formatArgentinaDateTime(row.firstPunchAt)} / {formatArgentinaDateTime(row.lastPunchAt)}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.lateMinutes}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.earlyDepartureMinutes}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                    {row.workedMinutes} / {row.expectedMinutes} min
                    {row.overtimeMinutes > 0 ? ` · extra ${row.overtimeMinutes}` : ''}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.status}</td>
                  {canCreateRequests && (
                    <td className="px-6 py-4">
                      {mode === 'absences' ? (
                        <ActionLink href={requestHref('absence_justification', row.employeeId, row.date)}>
                          Justificar ausencia
                        </ActionLink>
                      ) : mode === 'late' && row.lateMinutes > 0 ? (
                        <ActionLink href={requestHref('late_justification', row.employeeId, row.date)}>
                          Justificar tardanza
                        </ActionLink>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function requestHref(type: string, employeeId: string, date: string) {
  const qs = new URLSearchParams({
    type,
    employeeId,
    date,
    dateFrom: date,
    dateTo: date,
    fromReport: '1',
  });
  return `/attendance/requests?${qs.toString()}`;
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium" style={{ color: 'var(--brand-text)' }}>
      {children}
    </Link>
  );
}
