import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { ReportFilters } from '@/components/reports/ReportFilters';
import {
  formatEmployeeName,
  getAttendanceDaySummaries,
  getDistinctUsers,
  recalculateAttendanceSummaries,
  type AttendanceDaySummary,
} from '@/lib/api';
import { formatArgentinaDateTime, todayArgentinaDateKey } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    companyId?: string;
    recalculated?: string;
  }>;
}

export default async function DaySummariesPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const companyId = sp.companyId || '';
  const params = { dateFrom, dateTo, employeeId, companyId };
  const canRecalculate = user.companyRole === 'company_admin' || (user.isSuperAdmin && Boolean(companyId));
  const canCreateRequests = user.isSuperAdmin || user.companyRole === 'company_admin' || user.companyRole === 'operator';
  const [rows, userOptions] = await Promise.all([
    getAttendanceDaySummaries(params),
    getDistinctUsers(),
  ]);

  async function recalculateAction(formData: FormData) {
    'use server';

    const actionDateFrom = String(formData.get('dateFrom') || '');
    const actionDateTo = String(formData.get('dateTo') || '');
    const actionEmployeeId = String(formData.get('employeeId') || '');
    const actionCompanyId = String(formData.get('companyId') || '');
    await recalculateAttendanceSummaries({
      dateFrom: actionDateFrom,
      dateTo: actionDateTo,
      employeeId: actionEmployeeId,
      companyId: actionCompanyId,
    });
    const qs = new URLSearchParams();
    qs.set('dateFrom', actionDateFrom);
    qs.set('dateTo', actionDateTo);
    if (actionEmployeeId) qs.set('employeeId', actionEmployeeId);
    if (actionCompanyId) qs.set('companyId', actionCompanyId);
    qs.set('recalculated', '1');
    redirect(`/reports/day-summaries?${qs.toString()}`);
  }

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/reports" className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>
              ← Reportes
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Resumen diario calculado
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {rows.length} resumen(es) para el período seleccionado
            </p>
          </div>
          {canRecalculate && (
            <form action={recalculateAction}>
              <input type="hidden" name="dateFrom" value={dateFrom} />
              <input type="hidden" name="dateTo" value={dateTo} />
              <input type="hidden" name="employeeId" value={employeeId} />
              <input type="hidden" name="companyId" value={companyId} />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Recalcular período
              </button>
            </form>
          )}
        </div>

        {sp.recalculated === '1' && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            Período recalculado correctamente.
          </div>
        )}

        <ReportFilters
          action="/reports/day-summaries"
          userOptions={userOptions}
          dateFrom={dateFrom}
          dateTo={dateTo}
          employeeId={employeeId}
          companyId={companyId}
        />

        <DaySummariesTable rows={rows} canCreateRequests={canCreateRequests} />
      </main>
    </>
  );
}

function DaySummariesTable({
  rows,
  canCreateRequests,
}: {
  rows: AttendanceDaySummary[];
  canCreateRequests: boolean;
}) {
  return (
    <div className="card rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="px-6 py-4 text-left font-semibold">Empleado</th>
              <th className="px-6 py-4 text-left font-semibold">Fecha</th>
              <th className="px-6 py-4 text-left font-semibold">Primera</th>
              <th className="px-6 py-4 text-left font-semibold">Última</th>
              <th className="px-6 py-4 text-left font-semibold">Fichadas</th>
              <th className="px-6 py-4 text-left font-semibold">Minutos</th>
              <th className="px-6 py-4 text-left font-semibold">Esperados</th>
              <th className="px-6 py-4 text-left font-semibold">Tardanza</th>
              <th className="px-6 py-4 text-left font-semibold">Salida temprana</th>
              <th className="px-6 py-4 text-left font-semibold">Extra</th>
              <th className="px-6 py-4 text-left font-semibold">Estado</th>
              <th className="px-6 py-4 text-left font-semibold">Justificación</th>
              <th className="px-6 py-4 text-left font-semibold">Incompleto</th>
              <th className="px-6 py-4 text-left font-semibold">Flags</th>
              {canCreateRequests && <th className="px-6 py-4 text-left font-semibold">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canCreateRequests ? 15 : 14} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  No hay summaries calculados para los filtros seleccionados
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatEmployeeName(row.employee) ?? row.employeeId}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{row.employeeId}</div>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.date}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatArgentinaDateTime(row.firstPunchAt)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatArgentinaDateTime(row.lastPunchAt)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.totalPunchCount}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.workedMinutes}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.expectedMinutes}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.lateMinutes}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.earlyDepartureMinutes}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.overtimeMinutes}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {row.status}
                    </span>
                    {row.justificationStatus === 'approved' && (
                      <span className="mt-1 block text-xs font-medium" style={{ color: 'var(--brand-text)' }}>
                        {row.isAbsent ? 'Ausente justificado' : row.lateMinutes > 0 ? 'Tardanza justificada' : 'Justificado'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {row.justificationStatus}
                    {row.justificationRequestId ? <span className="block" style={{ color: 'var(--text-muted)' }}>{row.justificationRequestId}</span> : null}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                    {row.hasIncompleteRecord ? 'Sí' : 'No'}
                  </td>
                  <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {[
                      row.isAbsent ? 'ausente' : '',
                      row.isHoliday ? 'feriado' : '',
                      row.isWeekend ? 'fin de semana' : '',
                    ].filter(Boolean).join(', ') || '-'}
                  </td>
                  {canCreateRequests && (
                    <td className="px-6 py-4">
                      <SummaryAction row={row} />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryAction({ row }: { row: AttendanceDaySummary }) {
  if (row.isAbsent || row.status === 'absent') {
    return <ActionLink href={requestHref('absence_justification', row.employeeId, row.date)}>Justificar ausencia</ActionLink>;
  }
  if (row.lateMinutes > 0) {
    return <ActionLink href={requestHref('late_justification', row.employeeId, row.date)}>Justificar tardanza</ActionLink>;
  }
  if (row.hasIncompleteRecord || row.status === 'incomplete') {
    return <ActionLink href={requestHref('manual_punch', row.employeeId, row.date, { punchType: 'out' })}>Cargar fichada</ActionLink>;
  }
  return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>;
}

function requestHref(type: string, employeeId: string, date: string, extra?: Record<string, string>) {
  const qs = new URLSearchParams({
    type,
    employeeId,
    date,
    dateFrom: date,
    dateTo: date,
    fromReport: '1',
    ...(extra ?? {}),
  });
  return `/attendance/requests?${qs.toString()}`;
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium" style={{ color: 'var(--brand-text)' }}>
      {children}
    </Link>
  );
}
