import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ReportCard } from '@/components/reports/ReportCard';
import { getAdminCompanies } from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';

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

  const dailyControlReports = [
    {
      href: `/reports/daily-presence${suffix}`,
      title: 'Quién vino hoy',
      description: 'Entradas y salidas del día.',
      priority: 'primary' as const,
    },
    {
      href: `/reports/absences${suffix}`,
      title: 'Quién faltó',
      description: 'Personas sin asistencia.',
      priority: 'normal' as const,
    },
    {
      href: `/reports/late-arrivals${suffix}`,
      title: 'Llegadas tarde',
      description: 'Entradas después del horario.',
      priority: 'normal' as const,
    },
    {
      href: `/reports/incomplete-records${suffix}`,
      title: 'Falta entrada o salida',
      description: 'Días con fichada incompleta.',
      priority: 'normal' as const,
    },
    {
      href: `/reports/early-departures${suffix}`,
      title: 'Salidas tempranas',
      description: 'Salidas antes de horario.',
      priority: 'secondary' as const,
    },
  ];

  const monthlyClosingReports = [
    {
      href: `/reports/monthly-closing${suffix}`,
      title: 'Controlar el mes',
      description: 'Revisión previa a liquidación.',
      priority: 'primary' as const,
    },
    {
      href: `/reports/monthly-summary${suffix}`,
      title: 'Resumen mensual',
      description: 'Totales por persona.',
      priority: 'normal' as const,
    },
    {
      href: `/reports/worked-hours${suffix}`,
      title: 'Horas trabajadas',
      description: 'Horas calculadas del período.',
      priority: 'normal' as const,
    },
    {
      href: `/reports/day-summaries${suffix}`,
      title: 'Días calculados',
      description: 'Base para cierre y ausencias.',
      priority: 'secondary' as const,
    },
  ];

  const peopleReports = [
    {
      href: `/reports/employees-without-schedule${suffix}`,
      title: 'Sin horario asignado',
      description: 'No se puede calcular asistencia.',
      priority: 'normal' as const,
    },
    {
      href: `/reports/employees-without-punches${suffix}`,
      title: 'Sin fichadas',
      description: 'Personas sin marcaciones.',
      priority: 'normal' as const,
    },
  ];

  const requestReports = [
    {
      href: `/attendance/requests?status=pending${requestSuffix}`,
      title: 'Pendientes',
      description: 'Requieren aprobación o rechazo.',
      priority: 'primary' as const,
    },
    {
      href: `/attendance/requests?status=approved${requestSuffix}`,
      title: 'Aprobadas',
      description: 'Ya revisadas.',
      priority: 'normal' as const,
    },
    {
      href: `/attendance/requests?status=rejected${requestSuffix}`,
      title: 'Rechazadas',
      description: 'No aplicadas.',
      priority: 'normal' as const,
    },
    ...(canSeeOperationalAudit
      ? [
          {
            href: `/reports/corrected-punches${suffix}`,
            title: 'Correcciones',
            description: 'Cambios sobre fichadas.',
            priority: 'secondary' as const,
          },
          {
            href: `/reports/manual-punches${suffix}`,
            title: 'Fichadas manuales',
            description: 'Uso excepcional.',
            priority: 'secondary' as const,
          },
        ]
      : []),
  ];

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reportes</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Elegí qué necesitás controlar.
          </p>
        </div>

        <ReportSection title="Control Diario" description="Qué pasó hoy." reports={dailyControlReports} primary />
        <ReportSection title="Cierre Mensual" description="Control previo a liquidación." reports={monthlyClosingReports} primary />
        <ReportSection title="Personal" description="Qué empleado necesita revisión." reports={peopleReports} />
        <ReportSection title="Solicitudes y Correcciones" description="Intervención humana." reports={requestReports} primary />
      </main>
    </>
  );
}

function ReportSection({
  title,
  description,
  reports,
  primary = false,
}: {
  title: string;
  description: string;
  reports: Array<{ href: string; title: string; description: string; priority?: 'primary' | 'normal' | 'secondary' }>;
  primary?: boolean;
}) {
  return (
    <section className="mb-9">
      <div className="mb-3">
        <h2 className={`${primary ? 'text-xl' : 'text-lg'} font-semibold`} style={{ color: primary ? 'var(--brand-text)' : 'var(--text-primary)' }}>{title}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <ReportCard key={report.href} href={report.href} title={report.title} description={report.description} priority={report.priority} />
        ))}
      </div>
    </section>
  );
}
