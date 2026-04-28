import { EmployeesManagerContent } from '@/components/EmployeesManager';
import { getDevices, getEmployees, getScheduleProfiles } from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';

export default async function EmployeesPage() {
  const user = await requireCurrentSession();
  const canManage = !user.isSuperAdmin && user.companyRole === 'company_admin';
  const [employees, scheduleProfiles, devices] = await Promise.all([
    getEmployees(),
    canManage ? getScheduleProfiles() : Promise.resolve([]),
    canManage ? getDevices() : Promise.resolve([]),
  ]);

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Empleados</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {user.isSuperAdmin
              ? 'Vista global de empleados. La edición queda reservada a la administración de cada empresa.'
              : 'Administrá la maestra usada para enriquecer los registros de asistencia.'}
          </p>
        </div>

        <EmployeesManagerContent
          employees={employees}
          scheduleProfiles={scheduleProfiles}
          devices={devices}
          canManage={canManage}
        />
      </main>
    </>
  );
}
