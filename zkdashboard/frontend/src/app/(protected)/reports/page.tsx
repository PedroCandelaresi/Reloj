import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { getAdminCompanies } from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';

type ReportLink = {
  href: string;
  title: string;
  description: string;
  tag?: string;
};

export default async function ReportsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    const companies = await getAdminCompanies();
    return (
      <CompanyRequiredMessage reportName="Reportes">
        {companies.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            No hay empresas cargadas. Ejecutá el seed o cargá una empresa antes de consultar reportes.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {companies.map((company) => (
              <a
                key={company.id}
                href={`/reports?companyId=${company.id}`}
                className="rounded-lg border px-4 py-3 text-sm transition-colors hover:border-emerald-500"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <span className="block font-medium">{company.nombreFantasia || company.razonSocial}</span>
                <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>{company.cuit}</span>
              </a>
            ))}
          </div>
        )}
      </CompanyRequiredMessage>
    );
  }
  const suffix = companyId ? `?companyId=${companyId}` : '';
  const requestSuffix = companyId ? `&companyId=${companyId}` : '';
  const canSeeOperationalAudit = user.isSuperAdmin || user.companyRole === 'company_admin';

  const dailyPrimary = {
    href: `/reports/daily-presence${suffix}`,
    title: 'Quién vino hoy',
    description: 'Entradas y salidas del día.',
  };
  const dailyLinks = [
    { href: `/reports/absences${suffix}`, title: 'Ausencias', description: 'Quién faltó.' },
    { href: `/reports/late-arrivals${suffix}`, title: 'Llegadas tarde', description: 'Entradas fuera de horario.' },
    { href: `/reports/incomplete-records${suffix}`, title: 'Falta entrada o salida', description: 'Fichadas incompletas.' },
    { href: `/reports/early-departures${suffix}`, title: 'Salidas tempranas', description: 'Salidas antes de horario.' },
  ];

  const closingPrimary = {
    href: `/reports/monthly-closing${suffix}`,
    title: 'Cierre mensual',
    description: 'Control previo a liquidación.',
  };
  const closingLinks = [
    { href: `/reports/monthly-summary${suffix}`, title: 'Resumen mensual', description: 'Totales por persona.' },
    { href: `/reports/worked-hours${suffix}`, title: 'Horas trabajadas', description: 'Horas del período.' },
  ];

  const peoplePrimary = {
    href: `/reports/employees-without-schedule${suffix}`,
    title: 'Sin horario asignado',
    description: 'No se puede calcular asistencia.',
  };
  const peopleLinks = [
    { href: `/reports/employees-without-punches${suffix}`, title: 'Sin fichadas', description: 'Personas sin marcaciones.' },
  ];

  const requestPrimary = {
    href: `/attendance/requests?status=pending${requestSuffix}`,
    title: 'Pendientes',
    description: canSeeOperationalAudit ? 'Aprobar o rechazar.' : 'Ver qué falta revisar.',
  };
  const requestLinks = [
    { href: `/attendance/requests?status=approved${requestSuffix}`, title: 'Aprobadas', description: 'Ya revisadas.' },
    { href: `/attendance/requests?status=rejected${requestSuffix}`, title: 'Rechazadas', description: 'No aplicadas.' },
    ...(canSeeOperationalAudit
      ? [
          { href: `/reports/corrected-punches${suffix}`, title: 'Correcciones', description: 'Cambios sobre fichadas.' },
          { href: `/reports/manual-punches${suffix}`, title: 'Fichadas manuales', description: 'Administrativo.', tag: 'Excepcional' },
        ]
      : []),
  ];

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reportes</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Elegí una tarea y revisá los datos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ReportBlock
            title="Control Diario"
            subtitle="Qué pasó hoy"
            primary={dailyPrimary}
            links={dailyLinks}
          />
          <ReportBlock
            title="Cierre Mensual"
            subtitle="Control previo a liquidación"
            primary={closingPrimary}
            links={closingLinks}
          />
          <ReportBlock
            title="Personal"
            subtitle="Empleados que necesitan revisión"
            primary={peoplePrimary}
            links={peopleLinks}
          />
          <ReportBlock
            title="Solicitudes y Correcciones"
            subtitle="Intervención humana"
            primary={requestPrimary}
            links={requestLinks}
          />
        </div>
      </main>
    </>
  );
}

function ReportBlock({
  title,
  subtitle,
  primary,
  links,
}: {
  title: string;
  subtitle: string;
  primary: ReportLink;
  links: ReportLink[];
}) {
  return (
    <section
      className="rounded-xl border p-5"
      style={{
        background: 'var(--surface)',
        borderColor: 'rgba(31,199,119,0.45)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
      }}
    >
      <div className="mb-4">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--brand-text)' }}>
          {title}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>

      <a
        href={primary.href}
        className="block rounded-lg px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}
      >
        <span className="block text-base font-semibold">{primary.title}</span>
        <span className="mt-1 block text-sm">{primary.description}</span>
      </a>

      <div className="mt-4 grid grid-cols-1 gap-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-emerald-500"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <span>
              <span className="block font-medium">{link.title}</span>
              <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{link.description}</span>
            </span>
            {link.tag && (
              <span className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: 'var(--amber-soft)', color: 'var(--amber-text)' }}>
                {link.tag}
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
