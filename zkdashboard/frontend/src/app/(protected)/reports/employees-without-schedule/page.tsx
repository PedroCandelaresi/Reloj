import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { exportEmployeesWithoutScheduleReport, getDistinctUsers, getEmployeesWithoutScheduleReport, type EmployeeWithoutScheduleReportRow } from '@/lib/api';
import { formatAttendanceUserOption, formatEmployeeName } from '@/lib/format-employee';
import { requireCurrentSession } from '@/lib/session';

interface PageProps { searchParams: Promise<{ employeeId?: string; companyId?: string }> }

export default async function EmployeesWithoutSchedulePage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const employeeId = sp.employeeId || '';
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Empleados sin horario" />;
  }
  const params = { employeeId, companyId };
  const [rows, userOptions] = await Promise.all([getEmployeesWithoutScheduleReport(params), getDistinctUsers()]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
      <ReportHeader
        title="Empleados sin horario"
        subtitle={`Empleados a los que no se les puede calcular asistencia, tardanzas ni ausencias. ${rows.length} registro(s).`}
        excelHref={exportEmployeesWithoutScheduleReport(params)}
      />
      <EmployeeFilter action="/reports/employees-without-schedule" employeeId={employeeId} companyId={companyId} userOptions={userOptions} />
      <EmployeesWithoutScheduleTable rows={rows} />
    </main>
  );
}

function EmployeeFilter({
  action,
  employeeId,
  companyId,
  userOptions,
}: {
  action: string;
  employeeId: string;
  companyId: string;
  userOptions: Awaited<ReturnType<typeof getDistinctUsers>>;
}) {
  return (
    <form method="get" action={action} className="card mb-6 flex flex-wrap items-end gap-4 rounded-xl p-4">
      {companyId && <input type="hidden" name="companyId" value={companyId} />}
      <div>
        <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Empleado</label>
        <select
          name="employeeId"
          defaultValue={employeeId}
          className="min-w-56 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
        >
          <option value="">Todos</option>
          {userOptions.map((option) => (
            <option key={option.userId} value={option.userId}>{formatAttendanceUserOption(option)}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700">Filtrar</button>
      <Link href={action} className="rounded-lg px-4 py-2 text-sm transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        Limpiar
      </Link>
    </form>
  );
}

function EmployeesWithoutScheduleTable({ rows }: { rows: EmployeeWithoutScheduleReportRow[] }) {
  return (
    <div className="card rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="px-6 py-4 text-left font-semibold">Empleado</th>
              <th className="px-6 py-4 text-left font-semibold">Documento</th>
              <th className="px-6 py-4 text-left font-semibold">Estado</th>
              <th className="px-6 py-4 text-left font-semibold">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  Todos los empleados tienen horario configurado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.employeeId} className="table-row">
                  <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{formatEmployeeName(row.employee) ?? row.employeeId}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.document}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.status}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
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
