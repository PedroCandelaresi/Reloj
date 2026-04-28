import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { Phase2ReportTable } from '@/components/reports/Phase2ReportTable';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { exportLateArrivalsReport, getDistinctUsers, getLateArrivalsReport } from '@/lib/api';
import { todayArgentinaDateKey } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps { searchParams: Promise<{ dateFrom?: string; dateTo?: string; employeeId?: string; minLateMinutes?: string }> }

export default async function LateArrivalsPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const minLateMinutes = sp.minLateMinutes || '';
  const params = { dateFrom, dateTo, employeeId, minLateMinutes };
  const canCreateRequests = user.isSuperAdmin || user.companyRole === 'company_admin' || user.companyRole === 'operator';
  const [rows, userOptions] = await Promise.all([getLateArrivalsReport(params), getDistinctUsers()]);

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <ReportHeader title="Tardanzas" subtitle={`${rows.length} registro(s)`} excelHref={exportLateArrivalsReport(params)} />
        <ReportFilters action="/reports/late-arrivals" userOptions={userOptions} dateFrom={dateFrom} dateTo={dateTo} employeeId={employeeId} />
        <Phase2ReportTable rows={rows} mode="late" emptyMessage="No hay tardanzas para los filtros seleccionados" canCreateRequests={canCreateRequests} />
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
