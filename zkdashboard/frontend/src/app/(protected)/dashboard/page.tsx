import { DeviceStatusPanel } from '@/components/DeviceStatusPanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  formatAttendanceUser,
  formatOperationalVerifyMethod,
  getAttendanceDashboard,
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
  const attentionCount = summary.devicesOffline + summary.pendingCommands + summary.recentDeviceErrorCount;
  const activeCompany =
    user.memberships.find((membership) => membership.companyId === user.companyId)?.company;
  const activeCompanyName =
    activeCompany?.nombreFantasia || activeCompany?.razonSocial || 'Tu empresa';
  const canReviewRequests = user.companyRole === 'company_admin';

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark:text-white text-gray-900 drop-shadow-sm">Panel de la empresa</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Control diario de asistencia de {activeCompanyName}.
          </p>
        </div>

        <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <StatCard
            label="Presentes hoy"
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
            label="Requiere revisión"
            value={attentionCount}
            color={attentionCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
            hint="Suma relojes sin conexión, comandos pendientes y errores recientes."
          />
          <InfoCard label="Última sincronización" value={formatOptionalDate(summary.lastSyncAt)} />
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <ActionCard href="/records" title="Revisar asistencia" description="Ver fichadas del día y registros que requieren corrección." primary />
          <ActionCard href="/reports/absences" title="Ver ausencias" description="Detectar quién falta cuando el período ya fue calculado." />
          <ActionCard href="/reports/late-arrivals" title="Ver tardanzas" description="Controlar llegadas fuera de horario." />
          <ActionCard
            href="/attendance/requests?status=pending"
            title="Solicitudes pendientes"
            description={canReviewRequests ? 'Aprobar o rechazar justificaciones y correcciones.' : 'Ver justificaciones y correcciones pendientes.'}
          />
        </section>

        {summary.technicalNews.length > 0 && (
          <section className="mb-8 rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--amber-soft)', borderColor: 'rgba(251,191,36,0.3)', color: 'var(--amber-text)' }}>
            <p className="font-semibold">Hay avisos técnicos para revisar.</p>
            <ul className="mt-2 space-y-1">
              {summary.technicalNews.map((news) => (
                <li key={news}>{news}</li>
              ))}
            </ul>
          </section>
        )}

        <details className="mb-8">
          <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--brand-text)' }}>
            Estado de relojes y configuración
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-5">
            <div className="card rounded-xl p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Relojes asignados</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{devices.length}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <ChecklistLink href="/employees" label="Personal" />
                  <ChecklistLink href="#estado-relojes" label="Relojes" />
                  <ChecklistLink href="/settings" label="Horarios" />
                  <ChecklistLink href="/settings/holidays" label="Calendario" />
                </div>
              </div>
              {devices.length === 0 ? (
                <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                  Esta empresa no tiene relojes asignados. Contactá al administrador del sistema para asignar uno.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {devices.map((d) => (
                    <p key={d.id} className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {getCompanyDeviceName(d)} · {getCompanyDeviceModel(d)} · {formatLastCommunication(d)}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div id="estado-relojes">
              <DeviceStatusPanel
                devices={devices}
                canSync={
                  user.isSuperAdmin ||
                  user.companyRole === 'company_admin' ||
                  user.companyRole === 'operator'
                }
              />
            </div>
          </div>
        </details>

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
                      <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>{formatOperationalVerifyMethod(r)}</td>
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
    <div className="card rounded-xl p-6" title={hint} style={{ borderColor: 'rgba(31,199,119,0.35)' }}>
      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className="card block rounded-xl p-5 transition-colors hover:border-emerald-500"
      style={{ borderColor: primary ? 'rgba(31,199,119,0.55)' : 'rgba(31,199,119,0.35)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </Link>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card rounded-xl p-5" style={{ borderColor: 'rgba(31,199,119,0.35)' }}>
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
