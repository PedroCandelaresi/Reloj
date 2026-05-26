import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { exportManualPunchesReport, getDistinctUsers, getManualPunchesReport, type ManualPunchReportRow } from '@/lib/api';
import { formatArgentinaDateTime, todayArgentinaDateKey } from '@/lib/argentina-date';
import { formatEmployeeName } from '@/lib/format-employee';
import { requireCurrentSession } from '@/lib/session';

interface PageProps { searchParams: Promise<{ dateFrom?: string; dateTo?: string; employeeId?: string; companyId?: string }> }

export default async function ManualPunchesPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Fichadas manuales" />;
  }
  const params = { dateFrom, dateTo, employeeId, companyId };
  const [rows, userOptions] = await Promise.all([getManualPunchesReport(params), getDistinctUsers(companyId ? { companyId } : {})]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
      <ReportHeader
        title="Fichadas manuales"
        subtitle={`Marcaciones cargadas por RRHH cuando el reloj no registró la entrada o salida. ${rows.length} registro(s).`}
        excelHref={exportManualPunchesReport(params)}
        reportsHref={`/reports${companyId ? `?companyId=${companyId}` : ''}`}
      />
      <ReportFilters action="/reports/manual-punches" userOptions={userOptions} dateFrom={dateFrom} dateTo={dateTo} employeeId={employeeId} companyId={companyId} />
      <ManualPunchesTable rows={rows} />
    </main>
  );
}

function ManualPunchesTable({ rows }: { rows: ManualPunchReportRow[] }) {
  return (
    <div className="card rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="px-6 py-4 text-left font-semibold">Empleado</th>
              <th className="px-6 py-4 text-left font-semibold">Fecha y hora</th>
              <th className="px-6 py-4 text-left font-semibold">Tipo</th>
              <th className="px-6 py-4 text-left font-semibold">Tipo de justificación</th>
              <th className="px-6 py-4 text-left font-semibold">Adjuntos</th>
              <th className="px-6 py-4 text-left font-semibold">Motivo</th>
              <th className="px-6 py-4 text-left font-semibold">Cargado por</th>
              <th className="px-6 py-4 text-left font-semibold">Fecha de carga</th>
              <th className="px-6 py-4 text-left font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  No hay fichadas manuales en el período seleccionado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.employeeId}-${row.punchTime}-${row.requestId ?? 'manual'}`} className="table-row">
                  <td className="px-6 py-4">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatEmployeeName(row.employee) ?? row.employeeId}</div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{row.employeeId}</div>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatArgentinaDateTime(row.punchTime)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{punchTypeLabel(row.punchType)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.justificationTypeName ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.attachmentCount}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.reason ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.createdBy ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatArgentinaDateTime(row.createdAt)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{requestStatusLabel(row.requestStatus)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportHeader({ title, subtitle, excelHref, reportsHref }: { title: string; subtitle: string; excelHref: string; reportsHref: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href={reportsHref} className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
      </div>
      <ExportButtons excelHref={excelHref} />
    </div>
  );
}

function punchTypeLabel(type: string | null) {
  if (type === 'in') return 'Entrada';
  if (type === 'out') return 'Salida';
  return type || '-';
}

function requestStatusLabel(status: string | null) {
  if (status === 'approved') return 'Aprobada';
  if (status === 'pending') return 'Pendiente';
  if (status === 'rejected') return 'Rechazada';
  if (status === 'cancelled') return 'Cancelada';
  return '-';
}
