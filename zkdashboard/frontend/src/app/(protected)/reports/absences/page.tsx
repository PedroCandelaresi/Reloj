import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { Phase2ReportTable } from '@/components/reports/Phase2ReportTable';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { exportAbsencesReport, getAbsencesReport, getDistinctUsers } from '@/lib/api';
import { todayArgentinaDateKey } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps { searchParams: Promise<{ dateFrom?: string; dateTo?: string; employeeId?: string; justification?: string; companyId?: string }> }

export default async function AbsencesPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Ausencias" />;
  }
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const justification = sp.justification || 'all';
  const params = { dateFrom, dateTo, employeeId, justification, companyId };
  const canCreateRequests = user.isSuperAdmin || user.companyRole === 'company_admin' || user.companyRole === 'operator';
  const [rows, userOptions] = await Promise.all([getAbsencesReport(params), getDistinctUsers()]);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/reports" className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Ausencias</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Días laborales sin fichadas. {rows.length} registro(s).</p>
          </div>
          <ExportButtons excelHref={exportAbsencesReport(params)} />
        </div>
        <ReportFilters
          action="/reports/absences"
          userOptions={userOptions}
          dateFrom={dateFrom}
          dateTo={dateTo}
          employeeId={employeeId}
          companyId={companyId}
          justification={justification}
          showJustificationFilter
        />
        <Phase2ReportTable rows={rows} mode="absences" emptyMessage="No hay ausencias para el período seleccionado." canCreateRequests={canCreateRequests} />
      </main>
    </>
  );
}
