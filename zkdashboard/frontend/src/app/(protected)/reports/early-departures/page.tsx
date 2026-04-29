import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { Phase2ReportTable } from '@/components/reports/Phase2ReportTable';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { exportEarlyDeparturesReport, getDistinctUsers, getEarlyDeparturesReport } from '@/lib/api';
import { todayArgentinaDateKey } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps { searchParams: Promise<{ dateFrom?: string; dateTo?: string; employeeId?: string; companyId?: string }> }

export default async function EarlyDeparturesPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Salidas tempranas" />;
  }
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const params = { dateFrom, dateTo, employeeId, companyId };
  const [rows, userOptions] = await Promise.all([getEarlyDeparturesReport(params), getDistinctUsers()]);
  const exportParams = { dateFrom, dateTo, employeeId, companyId };

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-6">
          <Link href="/reports" className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Salidas tempranas</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{rows.length} registro(s)</p>
        </div>
        <ExportButtons excelHref={exportEarlyDeparturesReport(exportParams)} />
        <ReportFilters action="/reports/early-departures" userOptions={userOptions} dateFrom={dateFrom} dateTo={dateTo} employeeId={employeeId} companyId={companyId} />
        <Phase2ReportTable rows={rows} mode="early" emptyMessage="No hay salidas tempranas para los filtros seleccionados" />
      </main>
    </>
  );
}
