import { DeviceStatusPanel } from '@/components/DeviceStatusPanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  formatAttendanceUser,
  getAttendanceDashboard,
  VERIFY_LABELS,
} from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';
import { formatLastCommunication, getCompanyDeviceModel, getCompanyDeviceName } from '@/lib/ux-labels';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const TZ = 'America/Argentina/Buenos_Aires';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

function formatLastSeen(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

function formatOptionalDate(iso?: string | null) {
  if (!iso) return '—';
  return formatLastSeen(iso);
}

export default async function DashboardPage() {
  const user = await requireCurrentSession();
  if (user.isSuperAdmin) {
    redirect('/admin/dashboard');
  }

  const summary = await getAttendanceDashboard();
  const recent = summary.recentRecords;
  const devices = summary.devices;
  const devicesById = new Map(devices.map((device) => [device.id, device]));
  const activeCompany =
    user.memberships.find((membership) => membership.companyId === user.companyId)?.company;
  const activeCompanyName =
    activeCompany?.nombreFantasia || activeCompany?.razonSocial || 'Tu empresa';

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-8">
          <h1 className="text-2xl font-bold dark:text-white text-gray-900 drop-shadow-sm">Panel de la empresa</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Resumen operativo de asistencia de {activeCompanyName}.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 mb-8">
          <StatCard
            label="Personas presentes hoy"
            value={summary.presentToday}
            color="text-emerald-600 dark:text-emerald-400"
            hint="Empleados que registraron al menos una fichada hoy."
          />
          <StatCard
            label="Fichadas hoy"
            value={summary.recordsToday}
            color="text-blue-600 dark:text-blue-400"
            hint="Cada entrada o salida registrada en el reloj cuenta como una fichada."
          />
          <StatCard
            label="Relojes conectados"
            value={summary.devicesOnline}
            color="text-green-600 dark:text-green-400"
            hint="Relojes que se comunicaron recientemente con el sistema."
          />
          <StatCard
            label="Relojes sin conexión"
            value={summary.devicesOffline}
            color="text-red-600 dark:text-red-400"
            hint="Relojes que no se comunican recientemente con el sistema."
          />
          <StatCard
            label="Tareas pendientes del reloj"
            value={summary.pendingCommands}
            color="text-amber-600 dark:text-amber-400"
            hint="Instrucciones enviadas al reloj que todavía no fueron confirmadas."
          />
          <InfoCard label="Última sincronización" value={formatOptionalDate(summary.lastSyncAt)} />
        </div>

        <section className="card rounded-xl p-6 mb-8">
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Para que los reportes funcionen correctamente</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ChecklistLink href="/employees" label="Empleados cargados" />
            <ChecklistLink href="#estado-relojes" label="Reloj asignado" />
            <ChecklistLink href="/settings" label="Horarios configurados" />
            <ChecklistLink href="/settings/holidays" label="Feriados cargados" />
            <ChecklistLink href="/reports/monthly-summary" label="Período recalculado" />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 mb-8">
          <div className="card rounded-xl p-6">
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Relojes asignados</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{devices.length}</p>
            {devices.length === 0 ? (
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Esta empresa no tiene relojes asignados. Contactá al administrador del sistema para asignar uno.
              </p>
            ) : (
              devices.map((d) => (
                <p key={d.id} className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                  {getCompanyDeviceName(d)} · {getCompanyDeviceModel(d)} · {formatLastCommunication(d)}
                </p>
              ))
            )}
          </div>
        </div>

        <div id="estado-relojes" className="mb-8">
          <DeviceStatusPanel
            devices={devices}
            canSync={
              user.isSuperAdmin ||
              user.companyRole === 'company_admin' ||
              user.companyRole === 'operator'
            }
          />
        </div>

        <div className="card rounded-xl">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Actividad reciente</h2>
            <Link href="/records" className="text-sm font-medium transition-colors" style={{ color: 'var(--brand-text)' }}>
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header-row text-xs uppercase">
                  <th className="px-6 py-4 text-left font-semibold">Usuario</th>
                  <th className="px-6 py-4 text-left font-semibold">Fecha y Hora</th>
                  <th className="px-6 py-4 text-left font-semibold">Tipo de marcación del reloj</th>
                  <th className="px-6 py-4 text-left font-semibold">Método de marcación</th>
                  <th className="px-6 py-4 text-left font-semibold">Reloj</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No hay fichadas para mostrar. Verificá que el reloj esté conectado o cambiá el rango de fechas.
                    </td>
                  </tr>
                ) : (
                  recent.map((r) => (
                    <tr key={r.id} className="table-row">
                      <td className="px-6 py-4">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatAttendanceUser(r)}</div>
                        {r.employee && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{r.userId}</div>}
                      </td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatDate(r.timestamp)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.status} label={r.devicePunchStateLabel} />
                      </td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>{VERIFY_LABELS[r.verifyType] ?? r.verifyType}</td>
                      <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {r.deviceId ? getCompanyDeviceName(devicesById.get(r.deviceId) ?? null) : 'Reloj sin nombre'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value, color, hint }: { label: string; value: number; color: string; hint?: string }) {
  return (
    <div className="card rounded-xl p-6" title={hint}>
      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card rounded-xl p-5">
      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function ChecklistLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
    >
      {label}
    </Link>
  );
}
