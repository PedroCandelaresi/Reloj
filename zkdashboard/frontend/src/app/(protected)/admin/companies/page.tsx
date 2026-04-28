import { AdminCompaniesManager } from '@/components/AdminCompaniesManager';
import { AdminCompanyDetailPanel } from '@/components/AdminCompanyDetailPanel';
import {
  getAdminCompanies,
  getAdminCompanyEmployees,
  getAdminCompanyEligibleEmployees,
  getAdminCompanyUsers,
} from '@/lib/api';
import { requireSuperAdminSession } from '@/lib/session';

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  await requireSuperAdminSession();
  const sp = await searchParams;
  const companies = await getAdminCompanies();
  const selectedId = sp.company ?? null;
  const selectedCompany = selectedId ? (companies.find((c) => c.id === selectedId) ?? null) : null;

  const [employees, eligibleEmployees, users] = selectedCompany
    ? await Promise.all([
        getAdminCompanyEmployees(selectedCompany.id),
        getAdminCompanyEligibleEmployees(selectedCompany.id),
        getAdminCompanyUsers(selectedCompany.id),
      ])
    : [[], [], []];

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Empresas</h1>
          <p className="text-emerald-200/70 text-sm mt-1">
            Gestión global de empresas para la operación multiempresa.
          </p>
        </div>

        <AdminCompaniesManager companies={companies} selectedCompanyId={selectedId} />

        {selectedCompany && (
          <AdminCompanyDetailPanel
            company={selectedCompany}
            employees={employees}
            eligibleEmployees={eligibleEmployees}
            users={users}
          />
        )}
      </main>
    </>
  );
}
