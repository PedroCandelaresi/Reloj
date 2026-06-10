import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { DailyPresenceTable } from '@/components/reports/DailyPresenceTable';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { ReportFilters } from '@/components/reports/ReportFilters';
import {
  exportDailyPresenceReport,
  getDailyPresenceReport,
  getDevices,
  getDistinctUsers,
} from '@/lib/api';
import { todayArgentinaDateKey } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    deviceId?: string;
    companyId?: string;
  }>;
}

export default async function DailyPresencePage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Quién vino hoy" />;
  }
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const deviceId = sp.deviceId || '';
  const params = { dateFrom, dateTo, employeeId, deviceId, companyId };
  const [rows, userOptions, devices] = await Promise.all([
    getDailyPresenceReport(params),
    getDistinctUsers(companyId ? { companyId } : {}),
    getDevices(),
  ]);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <Header
          title="Quién vino hoy"
          description={`Entradas y salidas del día. ${rows.length} fila(s).`}
          excelHref={exportDailyPresenceReport(params)}
          reportsHref={`/reports${companyId ? `?companyId=${companyId}` : ''}`}
        />
        <ReportFilters
          action="/reports/daily-presence"
          userOptions={userOptions}
          devices={devices}
          dateFrom={dateFrom}
          dateTo={dateTo}
          employeeId={employeeId}
          deviceId={deviceId}
          companyId={companyId}
        />
        <DailyPresenceTable rows={rows} />
      </main>
    </>
  );
}

function Header({ title, description, excelHref, reportsHref }: { title: string; description: string; excelHref: string; reportsHref: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href={reportsHref} className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <ExportButtons excelHref={excelHref} />
    </div>
  );
}
