import { EmployeesManagerContent } from '@/components/EmployeesManager';
import { getDepartments, getDevices, getEmployees, getPositions, getScheduleProfiles } from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';

export default async function EmployeesPage() {
  const user = await requireCurrentSession();
  const canManage = !user.isSuperAdmin && user.companyRole === 'company_admin';
  const canQueryDeviceUsers =
    user.isSuperAdmin ||
    user.companyRole === 'company_admin' ||
    user.companyRole === 'operator' ||
    user.companyRole === 'read_only';
  const canRequestDeviceUserQuery =
    user.isSuperAdmin ||
    user.companyRole === 'company_admin' ||
    user.companyRole === 'operator';
  const canSyncDeviceUsers = user.isSuperAdmin || user.companyRole === 'company_admin';
  const [employees, scheduleProfiles, departments, positions, devices] = await Promise.all([
    getEmployees({ includeInactive: true }),
    canManage ? getScheduleProfiles() : Promise.resolve([]),
    getDepartments().catch(() => []),
    getPositions().catch(() => []),
    canQueryDeviceUsers ? getDevices() : Promise.resolve([]),
  ]);

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Personal</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {user.isSuperAdmin
              ? 'Vista global de empleados. La edición queda reservada a la administración de cada empresa.'
              : canManage
                ? 'Gestioná empleados, horarios y sincronización con relojes.'
                : 'Consultá empleados, horarios y datos operativos de tu empresa.'}
          </p>
        </div>

        <EmployeesManagerContent
          employees={employees}
          scheduleProfiles={scheduleProfiles}
          departments={departments}
          positions={positions}
          devices={devices}
          canManage={canManage}
          canQueryDeviceUsers={canQueryDeviceUsers}
          canRequestDeviceUserQuery={canRequestDeviceUserQuery}
          canSyncDeviceUsers={canSyncDeviceUsers}
        />
      </main>
    </>
  );
}
