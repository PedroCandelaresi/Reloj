import Link from 'next/link';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { IncompleteRecordsTable } from '@/components/reports/IncompleteRecordsTable';
import { ReportFilters } from '@/components/reports/ReportFilters';
import {
  exportIncompleteRecordsReport,
  getDevices,
  getDistinctUsers,
  getIncompleteRecordsReport,
} from '@/lib/api';
import { todayArgentinaDateKey } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    deviceId?: string;
  }>;
}

export default async function IncompleteRecordsPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const deviceId = sp.deviceId || '';
  const params = { dateFrom, dateTo, employeeId, deviceId };
  const canCreateRequests = user.isSuperAdmin || user.companyRole === 'company_admin' || user.companyRole === 'operator';
  const [rows, userOptions, devices] = await Promise.all([
    getIncompleteRecordsReport(params),
    getDistinctUsers(),
    getDevices(),
  ]);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/reports" className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Fichadas incompletas</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Días donde falta una entrada o salida. {rows.length} anomalía(s) para revisar.
            </p>
          </div>
          <ExportButtons excelHref={exportIncompleteRecordsReport(params)} />
        </div>
        <ReportFilters
          action="/reports/incomplete-records"
          userOptions={userOptions}
          devices={devices}
          dateFrom={dateFrom}
          dateTo={dateTo}
          employeeId={employeeId}
          deviceId={deviceId}
        />
        <IncompleteRecordsTable rows={rows} canCreateRequests={canCreateRequests} />
      </main>
    </>
  );
}
