import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { ReportCard } from '@/components/reports/ReportCard';
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
    return <CompanyRequiredMessage reportName="Reportes" />;
  }
  const suffix = companyId ? `?companyId=${companyId}` : '';
  const requestSuffix = companyId ? `&companyId=${companyId}` : '';
  const canSeeOperationalAudit = user.isSuperAdmin || user.companyRole === 'company_admin';

  const assistanceReports = [
    {
      href: `/reports/daily-presence${suffix}`,
      title: 'Asistencia diaria',
      description: 'Primera y última fichada por empleado.',
    },
    {
      href: `/reports/monthly-summary${suffix}`,
      title: 'Resumen mensual',
      description: 'Totales del mes por empleado.',
    },
    {
      href: `/reports/monthly-closing${suffix}`,
      title: 'Cierre mensual',
      description: 'Control del mes antes de liquidar sueldos.',
    },
    {
      href: `/reports/absences${suffix}`,
      title: 'Ausencias',
      description: 'Días laborales sin fichadas.',
    },
    {
      href: `/reports/late-arrivals${suffix}`,
      title: 'Llegadas tarde',
      description: 'Entradas fuera del horario permitido.',
    },
    {
      href: `/reports/worked-hours${suffix}`,
      title: 'Horas trabajadas',
      description: 'Tiempo calculado con fichadas y horarios.',
    },
  ];

  const peopleReports = [
    {
      href: `/reports/employees-without-schedule${suffix}`,
      title: 'Empleados sin horario',
      description: 'Personas sin perfil para calcular asistencia.',
    },
    {
      href: `/reports/employees-without-punches${suffix}`,
      title: 'Empleados sin fichadas',
      description: 'Personas sin marcaciones en el período.',
    },
  ];

  const requestReports = [
    {
      href: `/attendance/requests?status=pending${requestSuffix}`,
      title: 'Solicitudes pendientes',
      description: 'Correcciones y justificaciones por revisar.',
    },
    {
      href: `/attendance/requests?status=approved${requestSuffix}`,
      title: 'Solicitudes aprobadas',
      description: 'Historial aprobado para control operativo.',
    },
    {
      href: `/attendance/requests?status=rejected${requestSuffix}`,
      title: 'Solicitudes rechazadas',
      description: 'Casos revisados sin aplicación de cambios.',
    },
  ];

  const auditReports = [
    {
      href: `/reports/incomplete-records${suffix}`,
      title: 'Fichadas incompletas',
      description: 'Días donde falta una entrada o salida.',
    },
    {
      href: `/reports/day-summaries${suffix}`,
      title: 'Resúmenes diarios',
      description: 'Estado calculado por día, empleado y horario.',
    },
    {
      href: `/reports/early-departures${suffix}`,
      title: 'Salidas tempranas',
      description: 'Salidas anteriores al horario esperado.',
    },
    ...(canSeeOperationalAudit
      ? [
          {
            href: `/reports/corrected-punches${suffix}`,
            title: 'Fichadas corregidas',
            description: 'Cambios hechos sobre registros existentes.',
          },
          {
            href: `/reports/manual-punches${suffix}`,
            title: 'Fichadas manuales',
            description: 'Carga excepcional usada por administración.',
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
            Elegí qué querés revisar. Cada reporte permite exportar desde su propia pantalla.
          </p>
        </div>

        <ReportSection title="Asistencia" description="Control diario, mensual, ausencias, llegadas tarde y horas trabajadas." reports={assistanceReports} />
        <ReportSection title="Personal" description="Datos necesarios para que la asistencia pueda calcularse correctamente." reports={peopleReports} />
        <ReportSection title="Solicitudes y justificaciones" description="Seguimiento operativo de pedidos pendientes, aprobados y rechazados." reports={requestReports} />
        <ReportSection title="Auditoría y control" description="Registros incompletos, correcciones y validaciones del cálculo diario." reports={auditReports} />
      </main>
    </>
  );
}

function ReportSection({
  title,
  description,
  reports,
}: {
  title: string;
  description: string;
  reports: Array<{ href: string; title: string; description: string }>;
}) {
  return (
    <section className="mb-9">
      <div className="mb-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <ReportCard key={report.href} href={report.href} title={report.title} description={report.description} />
        ))}
      </div>
    </section>
  );
}
