import { ScheduleProfilesManager } from '@/components/ScheduleProfilesManager';
import { getScheduleProfiles } from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';
import Link from 'next/link';
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configuración</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Organizá los horarios, sectores, puestos y feriados de tu empresa.
          </p>
        </div>

        <div className="mb-6 rounded-lg border px-4 py-3 text-sm" style={{ background: 'rgba(59,130,246,0.07)', borderColor: 'rgba(59,130,246,0.25)', color: 'var(--text-secondary)' }}>
          Si cambiás un horario, recalculá el período desde <strong>Reportes → Resúmenes diarios</strong> para actualizar los resultados.
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/settings/org-structure"
            className="card block rounded-xl p-5 transition-colors hover:border-emerald-500"
          >
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Estructura de empresa</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Administrá sectores y puestos para organizar empleados y filtrar reportes.
            </p>
          </Link>
          <Link
            href="/settings/holidays"
            className="card block rounded-xl p-5 transition-colors hover:border-emerald-500"
          >
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Calendario laboral</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Revisá feriados y días no laborables que afectan los cálculos de asistencia.
            </p>
          </Link>
        </div>

        <ScheduleProfilesManager profiles={scheduleProfiles} />
      </main>
    </>
  );
}
