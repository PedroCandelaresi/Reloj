import { formatEmployeeName, type Phase2ReportRow } from '@/lib/api';
import { formatArgentinaDateTime } from '@/lib/argentina-date';

export function Phase2ReportTable({
  rows,
  emptyMessage,
  mode,
}: {
  rows: Phase2ReportRow[];
  emptyMessage: string;
  mode: 'late' | 'early' | 'absences' | 'worked';
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
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
