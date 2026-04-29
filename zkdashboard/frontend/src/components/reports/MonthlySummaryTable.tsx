import type { MonthlySummaryReportRow } from '@/lib/api';
import { getAttendanceJustificationLabel, getJustificationLabel } from '@/lib/ux-labels';
import {
  formatDateTime,
  formatMinutes,
  formatReportEmployee,
  statusClassName,
  statusLabel,
} from './report-utils';

export function MonthlySummaryTable({ rows }: { rows: MonthlySummaryReportRow[] }) {
  return (
    <div className="space-y-5">
      {rows.length === 0 ? (
        <div className="card rounded-xl px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Todavía no hay resultados calculados para este período. Recalculá el período para ver tardanzas, ausencias y horas trabajadas.
        </div>
      ) : (
        rows.map((row) => (
          <section key={row.userId} className="card rounded-xl">
            <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatReportEmployee(row.employee, row.userId)}
                </h2>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{row.userId}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <Metric label="Días con fichadas" value={String(row.daysWithRecords)} />
                <Metric
                  label="Presentismo"
                  value={formatAttendancePercentage(row.attendancePercentage)}
                  title="Porcentaje de días laborales en los que el empleado registró asistencia."
                />
                <Metric label="Presentes" value={String(row.presentDays)} />
                <Metric label="Ausentes" value={String(row.absentDays)} />
                <Metric label="Feriados" value={String(row.holidayDays)} />
                <Metric label="Fichadas" value={String(row.totalPunches)} />
                <Metric label="Tiempo" value={formatMinutes(row.totalWorkedMinutes)} />
                <Metric label="Tardanza" value={formatMinutes(row.totalLateMinutes)} />
                <Metric label="Incompletos" value={String(row.incompleteDays)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header-row text-xs uppercase">
                    <th className="px-6 py-4 text-left font-semibold">Día</th>
                    <th className="px-6 py-4 text-left font-semibold">Primera</th>
                    <th className="px-6 py-4 text-left font-semibold">Última</th>
                    <th className="px-6 py-4 text-left font-semibold">Fichadas</th>
                    <th className="px-6 py-4 text-left font-semibold">Tiempo</th>
                    <th className="px-6 py-4 text-left font-semibold">Esperado</th>
                    <th className="px-6 py-4 text-left font-semibold">Tardanza</th>
                    <th className="px-6 py-4 text-left font-semibold">Salida temprana</th>
                    <th className="px-6 py-4 text-left font-semibold">Extra</th>
                    <th className="px-6 py-4 text-left font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {row.days.map((day) => (
                    <tr key={day.date} className="table-row">
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{day.date}</td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(day.firstPunch)}</td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(day.lastPunch)}</td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{day.punchCount}</td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatMinutes(day.workedMinutes)}</td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatMinutes(day.expectedMinutes)}</td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatMinutes(day.lateMinutes)}</td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatMinutes(day.earlyDepartureMinutes)}</td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatMinutes(day.overtimeMinutes)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(day.status)}`}>
                          {statusLabel(day.status)}
                        </span>
                        {(day.isAbsent || day.lateMinutes > 0 || (day.justificationStatus && day.justificationStatus !== 'none')) && (
                          <span
                            className="mt-1 block text-xs font-medium"
                            style={{ color: day.justificationStatus === 'approved' ? 'var(--brand-text)' : 'var(--text-muted)' }}
                            title={getJustificationLabel(day.justificationStatus)}
                          >
                            {getAttendanceJustificationLabel({
                              isAbsent: day.isAbsent,
                              lateMinutes: day.lateMinutes,
                              justificationStatus: day.justificationStatus,
                            })}
                          </span>
                        )}
                        {(day.isHoliday || day.isWeekend || day.hasIncompleteRecord) && (
                          <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                            {[
                              day.isHoliday ? 'feriado' : '',
                              day.isWeekend ? 'fin de semana' : '',
                              day.hasIncompleteRecord ? 'incompleto' : '',
                            ].filter(Boolean).join(' · ')}
                          </span>
                        )}
                        {day.justificationTypeName && (
                          <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                            Tipo: {day.justificationTypeName}
                          </span>
                        )}
                        {(day.attachmentCount ?? 0) > 0 && (
                          <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                            {day.attachmentCount} adjunto(s)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function formatAttendancePercentage(value: number | null | undefined) {
  if (value === null) return 'Sin días laborales';
  if (value === undefined) return '-';
  return `${value}%`;
}
