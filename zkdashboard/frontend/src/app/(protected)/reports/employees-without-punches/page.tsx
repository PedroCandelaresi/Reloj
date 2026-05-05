import Link from 'next/link';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { exportEmployeesWithoutPunchesReport, getDepartments, getDistinctUsers, getEmployeesWithoutPunchesReport, getPositions, type EmployeeWithoutPunchesReportRow } from '@/lib/api';
import { todayArgentinaDateKey } from '@/lib/argentina-date';
import { formatEmployeeName } from '@/lib/format-employee';
import { requireCurrentSession } from '@/lib/session';

interface PageProps { searchParams: Promise<{ dateFrom?: string; dateTo?: string; employeeId?: string; companyId?: string; departmentId?: string; positionId?: string; includeInactive?: string }> }

export default async function EmployeesWithoutPunchesPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const dateFrom = sp.dateFrom || todayArgentinaDateKey();
  const dateTo = sp.dateTo || dateFrom;
  const employeeId = sp.employeeId || '';
  const companyId = sp.companyId || '';
  const departmentId = sp.departmentId || '';
  const positionId = sp.positionId || '';
  const includeInactive = sp.includeInactive || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Empleados sin fichadas" />;
  }
  const params = { dateFrom, dateTo, employeeId, departmentId, positionId, includeInactive, companyId };
  const [rows, userOptions, departments, positions] = await Promise.all([
    getEmployeesWithoutPunchesReport(params),
    getDistinctUsers(),
    getDepartments(companyId ? { companyId } : {}).catch(() => []),
    getPositions(companyId ? { companyId } : {}).catch(() => []),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
      <ReportHeader
        title="Empleados sin fichadas"
        subtitle={`Personas que no tuvieron ninguna marcación en el período seleccionado. ${rows.length} registro(s).`}
        excelHref={exportEmployeesWithoutPunchesReport(params)}
      />
      <ReportFilters action="/reports/employees-without-punches" userOptions={userOptions} dateFrom={dateFrom} dateTo={dateTo} employeeId={employeeId} companyId={companyId} departmentId={departmentId} positionId={positionId} includeInactive={includeInactive} departments={departments} positions={positions} />
      <EmployeesWithoutPunchesTable rows={rows} />
    </main>
  );
}

function EmployeesWithoutPunchesTable({ rows }: { rows: EmployeeWithoutPunchesReportRow[] }) {
  return (
    <div className="card rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="px-6 py-4 text-left font-semibold">Empleado</th>
              <th className="px-6 py-4 text-left font-semibold">Documento</th>
              <th className="px-6 py-4 text-left font-semibold">Desde</th>
              <th className="px-6 py-4 text-left font-semibold">Hasta</th>
              <th className="px-6 py-4 text-left font-semibold">Cantidad de fichadas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  Todos los empleados registraron al menos una fichada en este período.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.employeeId} className="table-row">
                  <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{formatEmployeeName(row.employee) ?? row.employeeId}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.document}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.dateFrom}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.dateTo}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{row.punchCount}</td>
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
