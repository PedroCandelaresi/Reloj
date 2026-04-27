import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { MonthlySummaryTable } from '@/components/reports/MonthlySummaryTable';
import { ReportFilters } from '@/components/reports/ReportFilters';
import {
  exportMonthlySummaryReport,
  getDistinctUsers,
  getMonthlySummaryReport,
} from '@/lib/api';
import { currentArgentinaPeriod } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    employeeId?: string;
  }>;
}

export default async function MonthlySummaryPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const fallback = currentArgentinaPeriod();
  const year = sp.year || fallback.year;
  const month = sp.month || fallback.month;
  const employeeId = sp.employeeId || '';
  const params = { year, month, employeeId };
  const [rows, userOptions] = await Promise.all([
    getMonthlySummaryReport(params),
    getDistinctUsers(),
  ]);

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/reports" className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>← Reportes</Link>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Resumen mensual</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {rows.length} empleado(s) en el período {String(month).padStart(2, '0')}/{year}
            </p>
          </div>
          <ExportButtons excelHref={exportMonthlySummaryReport(params)} />
        </div>
        <ReportFilters
          action="/reports/monthly-summary"
          mode="month"
          userOptions={userOptions}
          year={year}
          month={month}
          employeeId={employeeId}
        />
        <MonthlySummaryTable rows={rows} />
      </main>
    </>
  );
}
