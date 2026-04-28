import Link from 'next/link';
import type { IncompleteRecordsReportRow } from '@/lib/api';
import { formatReportEmployee, formatTime, reasonLabel } from './report-utils';

export function IncompleteRecordsTable({
  rows,
  canCreateRequests = false,
}: {
  rows: IncompleteRecordsReportRow[];
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
              <th className="px-6 py-4 text-left font-semibold">Fichadas</th>
              <th className="px-6 py-4 text-left font-semibold">Horarios</th>
              <th className="px-6 py-4 text-left font-semibold">Dispositivos</th>
              <th className="px-6 py-4 text-left font-semibold">Motivo</th>
              {canCreateRequests && <th className="px-6 py-4 text-left font-semibold">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canCreateRequests ? 7 : 6} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  No se encontraron fichadas incompletas en el período
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.userId}-${row.date}`} className="table-row">
                  <td className="px-6 py-4">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatReportEmployee(row.employee, row.userId)}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{row.userId}</div>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.date}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.punchCount}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                    {row.punchTimes.map(formatTime).join(', ')}
                  </td>
                  <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {row.devices.join(', ') || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                      {reasonLabel(row.reason)}
                    </span>
                  </td>
                  {canCreateRequests && (
                    <td className="px-6 py-4">
                      <Link href={manualPunchHref(row)} className="font-medium" style={{ color: 'var(--brand-text)' }}>
                        Cargar fichada
                      </Link>
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

function manualPunchHref(row: IncompleteRecordsReportRow) {
  const qs = new URLSearchParams({
    type: 'manual_punch',
    employeeId: row.userId,
    date: row.date,
    dateFrom: row.date,
    dateTo: row.date,
    punchType: 'out',
    fromReport: '1',
  });
  return `/attendance/requests?${qs.toString()}`;
}
