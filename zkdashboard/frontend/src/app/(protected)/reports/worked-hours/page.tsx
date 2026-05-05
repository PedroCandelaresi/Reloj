import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { Phase2ReportTable } from '@/components/reports/Phase2ReportTable';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { exportWorkedHoursReport, getDepartments, getDistinctUsers, getPositions, getWorkedHoursReport } from '@/lib/api';
import { todayArgentinaDateKey } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps { searchParams: Promise<{ dateFrom?: string; dateTo?: string; employeeId?: string; companyId?: string; departmentId?: string; positionId?: string; includeInactive?: string }> }

export default async function WorkedHoursPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Horas trabajadas" />;
  }
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const departmentId = sp.departmentId || '';
  const positionId = sp.positionId || '';
  const includeInactive = sp.includeInactive || '';
  const params = { dateFrom, dateTo, employeeId, departmentId, positionId, includeInactive, companyId };
  const [rows, userOptions, departments, positions] = await Promise.all([
    getWorkedHoursReport(params),
    getDistinctUsers(),
    getDepartments(companyId ? { companyId } : {}).catch(() => []),
    getPositions(companyId ? { companyId } : {}).catch(() => []),
  ]);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/reports" className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Horas trabajadas</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Tiempo trabajado calculado a partir de las fichadas y horarios configurados. {rows.length} registro(s).
            </p>
          </div>
          <ExportButtons excelHref={exportWorkedHoursReport(params)} />
        </div>
        <ReportFilters action="/reports/worked-hours" userOptions={userOptions} dateFrom={dateFrom} dateTo={dateTo} employeeId={employeeId} companyId={companyId} departmentId={departmentId} positionId={positionId} includeInactive={includeInactive} departments={departments} positions={positions} />
        <Phase2ReportTable rows={rows} mode="worked" emptyMessage="No hay horas trabajadas para el período seleccionado." />
      </main>
    </>
  );
}
