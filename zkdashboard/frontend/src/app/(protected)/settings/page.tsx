import { ScheduleProfilesManager } from '@/components/ScheduleProfilesManager';
import { getScheduleProfiles } from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const user = await requireCurrentSession();

  if (user.isSuperAdmin) {
    redirect('/admin/dashboard');
  }

  if (user.companyRole !== 'company_admin') {
    redirect('/dashboard');
  }

  const scheduleProfiles = await getScheduleProfiles();

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Perfiles de horario</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Los horarios se configuran mediante perfiles. Asigná un perfil a cada empleado para que el sistema pueda calcular tardanzas, ausencias, horas trabajadas y cierre mensual.
          </p>
        </div>

        <div className="mb-6 rounded-lg border px-4 py-3 text-sm" style={{ background: 'rgba(59,130,246,0.07)', borderColor: 'rgba(59,130,246,0.25)', color: 'var(--text-secondary)' }}>
          Después de crear o modificar un perfil, recalculá el período en <strong>Reportes → Resúmenes diarios</strong> para que los cambios se reflejen en tardanzas, ausencias y cierre mensual.
        </div>

        <ScheduleProfilesManager profiles={scheduleProfiles} />
      </main>
    </>
  );
}
