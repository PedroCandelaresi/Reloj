import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { Phase2ReportTable } from '@/components/reports/Phase2ReportTable';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { exportLateArrivalsReport, getDepartments, getDistinctUsers, getLateArrivalsReport, getPositions } from '@/lib/api';
import { todayArgentinaDateKey } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps { searchParams: Promise<{ dateFrom?: string; dateTo?: string; employeeId?: string; minLateMinutes?: string; justification?: string; companyId?: string; departmentId?: string; positionId?: string; includeInactive?: string }> }

export default async function LateArrivalsPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Tardanzas" />;
  }
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const departmentId = sp.departmentId || '';
  const positionId = sp.positionId || '';
  const includeInactive = sp.includeInactive || '';
  const justification = sp.justification || 'all';
  const minLateMinutes = sp.minLateMinutes || '';
  const params = { dateFrom, dateTo, employeeId, departmentId, positionId, includeInactive, minLateMinutes, justification, companyId };
  const canCreateRequests = user.isSuperAdmin || user.companyRole === 'company_admin';
  const [rows, userOptions, departments, positions] = await Promise.all([
    getLateArrivalsReport(params),
    getDistinctUsers(companyId ? { companyId } : {}),
    getDepartments(companyId ? { companyId } : {}).catch(() => []),
    getPositions(companyId ? { companyId } : {}).catch(() => []),
  ]);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <ReportHeader title="Tardanzas" subtitle={`Llegadas fuera del horario permitido. ${rows.length} registro(s).`} excelHref={exportLateArrivalsReport(params)} />
        <ReportFilters
          action="/reports/late-arrivals"
          userOptions={userOptions}
          dateFrom={dateFrom}
          dateTo={dateTo}
          employeeId={employeeId}
          companyId={companyId}
          departmentId={departmentId}
          positionId={positionId}
          includeInactive={includeInactive}
          departments={departments}
          positions={positions}
          justification={justification}
          showJustificationFilter
        />
        <Phase2ReportTable rows={rows} mode="late" emptyMessage="No hay tardanzas para el período seleccionado." canCreateRequests={canCreateRequests} />
      </main>
    </>
  );
}

function ReportHeader({ title, subtitle, excelHref }: { title: string; subtitle: string; excelHref: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href="/reports" className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
      </div>
      <ExportButtons excelHref={excelHref} />
    </div>
  );
}
