import type { DailyPresenceReportRow } from '@/lib/api';
import {
  formatDateTime,
  formatMinutes,
  formatReportEmployee,
  statusClassName,
  statusLabel,
} from './report-utils';

export function DailyPresenceTable({ rows }: { rows: DailyPresenceReportRow[] }) {
  return (
    <div className="card rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="px-6 py-4 text-left font-semibold">Empleado</th>
              <th className="px-6 py-4 text-left font-semibold">Fecha</th>
              <th className="px-6 py-4 text-left font-semibold">Primera</th>
              <th className="px-6 py-4 text-left font-semibold">Última</th>
              <th className="px-6 py-4 text-left font-semibold">Fichadas</th>
              <th className="px-6 py-4 text-left font-semibold">Tiempo</th>
              <th className="px-6 py-4 text-left font-semibold">Reloj</th>
              <th className="px-6 py-4 text-left font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  No hay fichadas para el período seleccionado. Verificá que el reloj esté conectado o cambiá el rango de fechas.
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
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(row.firstPunch)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(row.lastPunch)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.punchCount}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatMinutes(row.workedMinutes)}</td>
                  <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{row.primaryDevice ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
