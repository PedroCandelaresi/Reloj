import { CompanySettingsManager } from '@/components/CompanySettingsManager';
import { Navbar } from '@/components/Navbar';
import { getCompanySettings } from '@/lib/api';
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

  const company = await getCompanySettings();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-4xl mx-auto px-4 py-8 pt-32">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Configuración</h1>
          <p className="text-emerald-200/70 text-sm mt-1">
            Parámetros generales de horarios para la empresa.
          </p>
        </div>

        <CompanySettingsManager company={company} />
      </main>
    </>
  );
}
