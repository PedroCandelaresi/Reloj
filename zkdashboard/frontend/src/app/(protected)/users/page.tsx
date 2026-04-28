import { CompanyUsersManager } from '@/components/CompanyUsersManager';
import { getCompanyEligibleEmployees, getCompanyUsers } from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function CompanyUsersPage() {
  const user = await requireCurrentSession();

  if (user.isSuperAdmin) {
    redirect('/admin/companies');
  }

  if (user.companyRole !== 'company_admin') {
    redirect('/dashboard');
  }

  const [users, eligibleEmployees] = await Promise.all([
    getCompanyUsers(),
    getCompanyEligibleEmployees(),
  ]);

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Usuarios</h1>
          <p className="text-emerald-200/70 text-sm mt-1">
            Administrá accesos y roles para tu empresa.
          </p>
        </div>

        <CompanyUsersManager users={users} eligibleEmployees={eligibleEmployees} />
      </main>
    </>
  );
}
