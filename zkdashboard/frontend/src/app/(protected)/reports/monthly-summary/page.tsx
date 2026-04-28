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
  const paddedMonth = String(month).padStart(2, '0');
  const dateFrom = `${year}-${paddedMonth}-01`;
  const dateTo = `${year}-${paddedMonth}-${String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, '0')}`;
  const [report, userOptions] = await Promise.all([
    getMonthlySummaryReport(params),
    getDistinctUsers(),
  ]);
  const rows = report.rows;

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
            <span className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{
              background: report.source === 'summaries' ? 'var(--brand-soft)' : 'var(--blue-soft)',
              color: report.source === 'summaries' ? 'var(--brand-text)' : 'var(--blue-text)',
            }}>
              Fuente: {report.source === 'summaries' ? 'Resúmenes calculados' : 'Fichadas crudas'}
            </span>
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
        {report.source === 'raw_records' && (
          <div className="mb-5 rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--blue-soft)', borderColor: 'rgba(59,130,246,0.25)', color: 'var(--blue-text)' }}>
            Este reporte usa fichadas crudas. Para ver tardanzas, ausencias y feriados, recalculá el período desde Resúmenes diarios.
          </div>
        )}
        {report.source === 'summaries' && report.coverage.isPartial && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)', color: 'var(--text-primary)' }}>
            <div>
              <p className="font-semibold">El período tiene resúmenes parciales.</p>
              <p className="mt-1">
                Recalculá el mes completo antes de usar este reporte para RRHH. Faltan {report.coverage.missingSummaryDays} resumen(es) diario(s).
              </p>
            </div>
            <Link href={`/reports/day-summaries?dateFrom=${dateFrom}&dateTo=${dateTo}${employeeId ? `&employeeId=${employeeId}` : ''}`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Recalcular período
            </Link>
          </div>
        )}
        <MonthlySummaryTable rows={rows} />
      </main>
    </>
  );
}
