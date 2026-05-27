import Link from 'next/link';
import { OrgStructureManager } from '@/components/OrgStructureManager';
import { getDepartments, getPositions } from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';

interface PageProps {
  searchParams: Promise<{ companyId?: string }>;
}

export default async function OrgStructurePage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const companyId = sp.companyId || '';
  const canManage = user.isSuperAdmin || user.companyRole === 'company_admin';
  const backHref = user.isSuperAdmin
    ? (companyId ? `/admin/companies?company=${companyId}` : '/admin/companies')
    : '/settings';

  const [departments, positions] = await Promise.all([
    getDepartments(companyId ? { companyId } : {}).catch(() => []),
    getPositions(companyId ? { companyId } : {}).catch(() => []),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={backHref} className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>
            ← Configuración
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Estructura de la empresa</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Configurá sectores/departamentos y puestos/cargos para organizar empleados y filtrar reportes.
          </p>
        </div>
      </div>

      {user.isSuperAdmin && !companyId ? (
        <div className="card rounded-xl px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Para administrar la estructura como super admin, primero seleccioná una empresa desde el panel de empresas.
        </div>
      ) : (
        <OrgStructureManager
          departments={departments}
          positions={positions}
          canManage={canManage}
          companyId={companyId || undefined}
        />
      )}
    </main>
  );
}
