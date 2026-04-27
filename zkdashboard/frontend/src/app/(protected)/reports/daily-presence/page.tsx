import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
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
  }>;
}

export default async function DailyPresencePage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const deviceId = sp.deviceId || '';
  const params = { dateFrom, dateTo, employeeId, deviceId };
  const [rows, userOptions, devices] = await Promise.all([
    getDailyPresenceReport(params),
    getDistinctUsers(),
    getDevices(),
  ]);

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <Header
          title="Presencia diaria"
          description={`${rows.length} fila(s) para el período seleccionado`}
          excelHref={exportDailyPresenceReport(params)}
        />
        <ReportFilters
          action="/reports/daily-presence"
          userOptions={userOptions}
          devices={devices}
          dateFrom={dateFrom}
          dateTo={dateTo}
          employeeId={employeeId}
          deviceId={deviceId}
        />
        <DailyPresenceTable rows={rows} />
      </main>
    </>
  );
}

function Header({ title, description, excelHref }: { title: string; description: string; excelHref: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href="/reports" className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <ExportButtons excelHref={excelHref} />
    </div>
  );
}
