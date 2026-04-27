import { Navbar } from '@/components/Navbar';
import { ReportCard } from '@/components/reports/ReportCard';
import { requireCurrentSession } from '@/lib/session';

export default async function ReportsHubPage() {
  const user = await requireCurrentSession();

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reportes</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Informes básicos de asistencia construidos con las fichadas actuales.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <ReportCard
            href="/reports/daily-presence"
            title="Presencia diaria"
            description="Primera y última fichada por empleado, total de marcas y tiempo estimado."
          />
          <ReportCard
            href="/reports/incomplete-records"
            title="Fichadas incompletas"
            description="Días con una sola fichada o cantidad impar de registros para revisar."
          />
          <ReportCard
            href="/reports/monthly-summary"
            title="Resumen mensual"
            description="Totales por empleado y detalle diario del mes consultado."
          />
          <ReportCard
            href="/reports/day-summaries"
            title="Resumen diario calculado"
            description="Validación del motor diario con estado, fichadas y minutos estimados."
          />
          <ReportCard href="/reports/late-arrivals" title="Tardanzas" description="Llegadas fuera de tolerancia calculadas desde summaries." />
          <ReportCard href="/reports/early-departures" title="Salidas tempranas" description="Salidas anteriores al horario esperado con tolerancia." />
          <ReportCard href="/reports/absences" title="Ausencias" description="Días laborales con horario esperado y sin fichadas." />
          <ReportCard href="/reports/worked-hours" title="Horas trabajadas" description="Minutos trabajados, esperados y extra simple por día." />
        </div>
      </main>
    </>
  );
}
