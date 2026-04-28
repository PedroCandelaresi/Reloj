import { CompanySettingsManager } from '@/components/CompanySettingsManager';
import { ScheduleProfilesManager } from '@/components/ScheduleProfilesManager';
import { getCompanySettings, getScheduleProfiles } from '@/lib/api';
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

  const [company, scheduleProfiles] = await Promise.all([
    getCompanySettings(),
    getScheduleProfiles(),
  ]);

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configuración</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Parámetros generales de horarios para la empresa.
          </p>
        </div>

        <div className="space-y-6">
          <CompanySettingsManager company={company} />
          <ScheduleProfilesManager profiles={scheduleProfiles} />
        </div>
      </main>
    </>
  );
}
