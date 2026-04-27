import { Navbar } from '@/components/Navbar';
import { AdminDevicesManager } from '@/components/AdminDevicesManager';
import { getAdminCompanies, getAdminDevices } from '@/lib/api';
import { requireSuperAdminSession } from '@/lib/session';

export default async function AdminDevicesPage() {
  const user = await requireSuperAdminSession();
  const [companies, devices] = await Promise.all([
    getAdminCompanies(),
    getAdminDevices(),
  ]);

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            Dispositivos globales
          </h1>
          <p className="text-emerald-200/70 text-sm mt-1">
            Vinculá relojes detectados a empresas y revisá los pendientes de asignación.
          </p>
        </div>

        <AdminDevicesManager devices={devices} companies={companies} />
      </main>
    </>
  );
}
