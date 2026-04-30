import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { ReportFilters } from '@/components/reports/ReportFilters';
import {
  exportMonthlyClosingReport,
  getDistinctUsers,
  getMonthlyClosingReport,
  type MonthlyClosingReport,
  type MonthlyClosingReportRow,
  type MonthlyClosingStatus,
} from '@/lib/api';
import { currentArgentinaPeriod } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    employeeId?: string;
    companyId?: string;
  }>;
}

export default async function MonthlyClosingPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const fallback = currentArgentinaPeriod();
  const year = sp.year || fallback.year;
  const month = sp.month || fallback.month;
  const employeeId = sp.employeeId || '';
  const companyId = sp.companyId || '';

  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Cierre mensual" />;
  }

  const params = { year, month, employeeId, companyId };
  const paddedMonth = String(month).padStart(2, '0');
  const dateFrom = `${year}-${paddedMonth}-01`;
  const dateTo = `${year}-${paddedMonth}-${String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, '0')}`;
  const [report, userOptions] = await Promise.all([
    getMonthlyClosingReport(params),
    getDistinctUsers(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/reports" className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cierre mensual</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Resumen de asistencia para preliquidación. Este reporte no calcula sueldos.
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Revisá las observaciones antes de exportar. Si corregiste fichadas o aprobaste solicitudes, recalculá el período.
          </p>
        </div>
        <ExportButtons excelHref={exportMonthlyClosingReport(params)} />
      </div>

      <ReportFilters
        action="/reports/monthly-closing"
        mode="month"
        userOptions={userOptions}
        year={year}
        month={month}
        employeeId={employeeId}
        companyId={companyId}
      />

      <CoverageNotice report={report} dateFrom={dateFrom} dateTo={dateTo} employeeId={employeeId} companyId={companyId} />

      {!report.coverage.hasEmployees ? (
        <div className="card rounded-xl px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No hay empleados cargados para esta empresa. Cargá empleados antes de generar el cierre mensual.
        </div>
      ) : report.rows.length === 0 ? (
        <div className="card rounded-xl px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No hay datos calculados para este período. Recalculá el mes para generar el cierre mensual.
        </div>
      ) : (
        <>
          <TotalsCards report={report} />
          <MonthlyClosingTable rows={report.rows} />
        </>
      )}
    </main>
  );
}

function CoverageNotice({
  report,
  dateFrom,
  dateTo,
  employeeId,
  companyId,
}: {
  report: MonthlyClosingReport;
  dateFrom: string;
  dateTo: string;
  employeeId: string;
  companyId: string;
}) {
  if (report.coverage.isComplete) {
    return (
      <div className="mb-5 rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--brand-soft)', borderColor: 'rgba(16,185,129,0.25)', color: 'var(--brand-text)' }}>
        El período está recalculado para cierre mensual.
      </div>
    );
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)', color: 'var(--text-primary)' }}>
      <div>
        <p className="font-semibold">El período tiene datos parcialmente recalculados.</p>
        <p className="mt-1">
          Recalculá el mes completo antes de usar este reporte para cierre mensual. Faltan {report.coverage.missingSummaryDays} resumen(es) diario(s).
        </p>
      </div>
      <Link href={`/reports/day-summaries?dateFrom=${dateFrom}&dateTo=${dateTo}${employeeId ? `&employeeId=${employeeId}` : ''}${companyId ? `&companyId=${companyId}` : ''}`}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Recalcular período
      </Link>
    </div>
  );
}

function TotalsCards({ report }: { report: MonthlyClosingReport }) {
  const items = [
    { label: 'Empleados', value: report.totals.employees },
    { label: 'Días trabajados', value: report.totals.workedDays },
    { label: 'Ausencias sin justificar', value: report.totals.unjustifiedAbsences },
    { label: 'Tardanzas sin justificar', value: report.rows.reduce((total, row) => total + row.unjustifiedLateDaysCount, 0) },
    { label: 'Justificaciones pendientes', value: report.rows.reduce((total, row) => total + row.pendingJustificationsCount, 0) },
    { label: 'Fichadas manuales/corregidas', value: report.totals.manualPunches + report.totals.correctedPunches },
  ];

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="card rounded-xl p-4">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
          <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function MonthlyClosingTable({ rows }: { rows: MonthlyClosingReportRow[] }) {
  return (
    <div className="card rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="px-5 py-4 text-left font-semibold">Empleado</th>
              <th className="px-5 py-4 text-left font-semibold">Días trabajados</th>
              <th className="px-5 py-4 text-left font-semibold">Ausencias</th>
              <th className="px-5 py-4 text-left font-semibold">Tardanzas</th>
              <th className="px-5 py-4 text-left font-semibold">Pendientes</th>
              <th className="px-5 py-4 text-left font-semibold">Horas</th>
              <th className="px-5 py-4 text-left font-semibold">Presentismo</th>
              <th className="px-5 py-4 text-left font-semibold">Fichadas RRHH</th>
              <th className="px-5 py-4 text-left font-semibold">Estado</th>
              <th className="px-5 py-4 text-left font-semibold">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employeeId} className="table-row align-top">
                <td className="px-5 py-4">
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.employeeName}</div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>N° de usuario: {row.document}</div>
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>
                  {row.workedDaysCount} / {row.workDaysCount}
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>
                  <div>{row.justifiedAbsentDaysCount} justificadas</div>
                  <div>{row.unjustifiedAbsentDaysCount} sin justificar</div>
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>
                  <div>{row.justifiedLateDaysCount} justificadas</div>
                  <div>{row.unjustifiedLateDaysCount} sin justificar</div>
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>
                  <div>{row.pendingJustificationsCount} justificaciones</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {row.pendingAbsenceJustificationsCount} ausencias · {row.pendingLateJustificationsCount} tardanzas
                  </div>
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>
                  <div>Trabajadas: {minutesToHours(row.workedMinutes)} h</div>
                  <div>Esperadas: {minutesToHours(row.expectedMinutes)} h</div>
                  <div>Extra simples: {minutesToHours(row.overtimeMinutes)} h</div>
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>
                  {row.attendancePercentage === null ? 'Sin días laborales' : `${row.attendancePercentage}%`}
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>
                  <div>{row.manualPunchesCount} manuales</div>
                  <div>{row.correctedPunchesCount} corregidas</div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>
                  {row.observations.join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MonthlyClosingStatus }) {
  const styles: Record<MonthlyClosingStatus, { label: string; background: string; color: string; tooltip: string }> = {
    ok: { label: 'OK', background: 'var(--brand-soft)', color: 'var(--brand-text)', tooltip: '' },
    review_required: { label: 'Revisar', background: 'rgba(245,158,11,0.14)', color: '#b45309', tooltip: 'Hay ausencias, tardanzas o justificaciones pendientes de revisión.' },
    incomplete_data: { label: 'Datos incompletos', background: 'rgba(239,68,68,0.12)', color: '#b91c1c', tooltip: 'Faltan datos para calcular correctamente el mes. El empleado puede no tener perfil horario asignado o el período puede no estar recalculado.' },
  };
  const style = styles[status];
  return (
    <span
      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: style.background, color: style.color, cursor: style.tooltip ? 'help' : 'default' }}
      title={style.tooltip || undefined}
    >
      {style.label}
    </span>
  );
}

function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}
