import { Navbar } from '@/components/Navbar';
import { EmployeesManagerContent } from '@/components/EmployeesManager';
import { getEmployees } from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';

export default async function EmployeesPage() {
  const user = await requireCurrentSession();
  const employees = await getEmployees();
  const canManage = !user.isSuperAdmin && user.companyRole === 'company_admin';

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Empleados</h1>
          <p className="text-emerald-200/70 text-sm mt-1">
            {user.isSuperAdmin
              ? 'Vista global de empleados. La edición queda reservada a la administración de cada empresa.'
              : 'Administrá la maestra usada para enriquecer los registros de asistencia.'}
          </p>
        </div>

        <EmployeesManagerContent employees={employees} canManage={canManage} />
      </main>
    </>
  );
}
