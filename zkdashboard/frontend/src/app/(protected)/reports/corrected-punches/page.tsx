import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { exportCorrectedPunchesReport, getCorrectedPunchesReport, getDistinctUsers, type CorrectedPunchReportRow } from '@/lib/api';
import { formatArgentinaDateTime, todayArgentinaDateKey } from '@/lib/argentina-date';
import { formatEmployeeName } from '@/lib/format-employee';
import { requireCurrentSession } from '@/lib/session';

interface PageProps { searchParams: Promise<{ dateFrom?: string; dateTo?: string; employeeId?: string; companyId?: string }> }

export default async function CorrectedPunchesPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Fichadas corregidas" />;
  }
  const params = { dateFrom, dateTo, employeeId, companyId };
  const [rows, userOptions] = await Promise.all([getCorrectedPunchesReport(params), getDistinctUsers(companyId ? { companyId } : {})]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
      <ReportHeader
        title="Fichadas corregidas"
        subtitle={`Cambios realizados sobre fichadas existentes, con auditoría. ${rows.length} registro(s).`}
        excelHref={exportCorrectedPunchesReport(params)}
        reportsHref={`/reports${companyId ? `?companyId=${companyId}` : ''}`}
      />
      <ReportFilters action="/reports/corrected-punches" userOptions={userOptions} dateFrom={dateFrom} dateTo={dateTo} employeeId={employeeId} companyId={companyId} />
      <CorrectedPunchesTable rows={rows} />
    </main>
  );
}

function CorrectedPunchesTable({ rows }: { rows: CorrectedPunchReportRow[] }) {
  return (
    <div className="card rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="px-6 py-4 text-left font-semibold">Empleado</th>
              <th className="px-6 py-4 text-left font-semibold">Fecha original</th>
              <th className="px-6 py-4 text-left font-semibold">Fecha corregida</th>
              <th className="px-6 py-4 text-left font-semibold">Valor anterior</th>
              <th className="px-6 py-4 text-left font-semibold">Valor nuevo</th>
              <th className="px-6 py-4 text-left font-semibold">Tipo de justificación</th>
              <th className="px-6 py-4 text-left font-semibold">Adjuntos</th>
              <th className="px-6 py-4 text-left font-semibold">Motivo</th>
              <th className="px-6 py-4 text-left font-semibold">Corregido por</th>
              <th className="px-6 py-4 text-left font-semibold">Fecha de corrección</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  No hay fichadas corregidas en el período seleccionado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.employeeId ?? 'empleado'}-${row.correctedAt}-${row.requestId ?? 'correccion'}`} className="table-row">
                  <td className="px-6 py-4">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatEmployeeName(row.employee) ?? row.employeeId ?? '-'}</div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{row.employeeId ?? '-'}</div>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.originalDate ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.correctedDate ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.oldValue ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.newValue ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.justificationTypeName ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.attachmentCount}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.reason ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.correctedBy ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatArgentinaDateTime(row.correctedAt)}</td>
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
