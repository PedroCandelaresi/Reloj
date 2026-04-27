import { Navbar } from '@/components/Navbar';
import { AdminCompaniesManager } from '@/components/AdminCompaniesManager';
import { getAdminCompanies } from '@/lib/api';
import { requireSuperAdminSession } from '@/lib/session';

export default async function AdminCompaniesPage() {
  const user = await requireSuperAdminSession();
  const companies = await getAdminCompanies();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Empresas</h1>
          <p className="text-emerald-200/70 text-sm mt-1">
            Gestión global de empresas para la operación multiempresa.
          </p>
        </div>

        <AdminCompaniesManager companies={companies} />
      </main>
    </>
  );
}
