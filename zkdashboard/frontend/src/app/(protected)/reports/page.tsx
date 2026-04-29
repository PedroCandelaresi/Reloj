import { ReportCard } from '@/components/reports/ReportCard';

export default async function ReportsHubPage() {
  return (
    <>
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
            description="Primera y última fichada por empleado."
          />
          <ReportCard
            href="/reports/incomplete-records"
            title="Fichadas incompletas"
            description="Días donde falta una entrada o salida."
          />
          <ReportCard
            href="/reports/monthly-summary"
            title="Resumen mensual"
            description="Totales del mes por empleado."
          />
          <ReportCard
            href="/reports/day-summaries"
            title="Resumen diario calculado"
            description="Validación del motor diario con estado, fichadas y minutos estimados."
          />
          <ReportCard href="/reports/late-arrivals" title="Tardanzas" description="Llegadas fuera del horario permitido." />
          <ReportCard href="/reports/early-departures" title="Salidas tempranas" description="Salidas anteriores al horario esperado con tolerancia." />
          <ReportCard href="/reports/absences" title="Ausencias" description="Días laborales sin fichadas." />
          <ReportCard href="/reports/worked-hours" title="Horas trabajadas" description="Tiempo trabajado calculado a partir de las fichadas y horarios configurados." />
          <ReportCard
            href="/reports/manual-punches"
            title="Fichadas manuales"
            description="Marcaciones cargadas por RRHH cuando el reloj no registró la entrada o salida."
          />
          <ReportCard
            href="/reports/corrected-punches"
            title="Fichadas corregidas"
            description="Cambios realizados sobre fichadas existentes, con auditoría."
          />
          <ReportCard
            href="/reports/employees-without-schedule"
            title="Empleados sin horario"
            description="Empleados a los que no se les puede calcular asistencia, tardanzas ni ausencias."
          />
          <ReportCard
            href="/reports/employees-without-punches"
            title="Empleados sin fichadas"
            description="Personas que no tuvieron ninguna marcación en el período seleccionado."
          />
        </div>
      </main>
    </>
  );
}
