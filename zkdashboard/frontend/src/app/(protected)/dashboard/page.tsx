import { DeviceStatusPanel } from '@/components/DeviceStatusPanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  formatAttendanceUser,
  getAttendanceDashboard,
  getStats,
  VERIFY_LABELS,
} from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';
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

  const [stats, summary] = await Promise.all([
    getStats(),
    getAttendanceDashboard(),
  ]);
  const recent = summary.recentRecords;
  const devices = summary.devices;
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
          <StatCard label="Presentes hoy" value={summary.presentToday} color="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Fichadas hoy" value={summary.recordsToday} color="text-blue-600 dark:text-blue-400" />
          <StatCard label="Online" value={summary.devicesOnline} color="text-green-600 dark:text-green-400" />
          <StatCard label="Offline" value={summary.devicesOffline} color="text-slate-600 dark:text-slate-400" />
          <StatCard label="Comandos pendientes" value={summary.pendingCommands} color="text-amber-600 dark:text-amber-400" />
          <InfoCard label="Última sync" value={formatOptionalDate(summary.lastSyncAt)} />
          <div className="card rounded-xl p-5 lg:col-span-6">
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Novedades técnicas</p>
            {summary.technicalNews.map((item) => (
              <p key={item} className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard label="Registros Hoy" value={stats.totalToday} color="text-blue-600 dark:text-blue-400" />
          <StatCard label="Registros Esta Semana" value={stats.totalWeek} color="text-green-600 dark:text-green-400" />
          <div className="card rounded-xl p-6">
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Dispositivos</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{devices.length}</p>
            {devices.map((d) => (
              <p key={d.id} className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                {d.serialNumber} · {d.ipAddress} · {formatLastSeen(d.lastSeen)}
              </p>
            ))}
          </div>
        </div>

        <div className="mb-8">
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
                  <th className="px-6 py-4 text-left font-semibold">Estado</th>
                  <th className="px-6 py-4 text-left font-semibold">Verificación</th>
                  <th className="px-6 py-4 text-left font-semibold">Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No hay registros aún. El reloj enviará datos cuando detecte fichajes.
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
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>{VERIFY_LABELS[r.verifyType] ?? r.verifyType}</td>
                      <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{r.deviceSn}</td>
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card rounded-xl p-6">
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
