import { Navbar } from '@/components/Navbar';
import { DeviceStatusPanel } from '@/components/DeviceStatusPanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  formatAttendanceUser,
  getDashboardSummary,
  getDevices,
  getRecent,
  getStats,
  VERIFY_LABELS,
} from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';
import Link from 'next/link';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatLastSeen(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function formatOptionalDate(iso?: string | null) {
  if (!iso) return '—';
  return formatLastSeen(iso);
}

export default async function DashboardPage() {
  const user = await requireCurrentSession();
  const [stats, summary, recent, devices] = await Promise.all([
    getStats(),
    getDashboardSummary(),
    getRecent(),
    getDevices(),
  ]);
  const activeCompany =
    user.memberships.find((membership) => membership.companyId === user.companyId)?.company;
  const activeCompanyName =
    activeCompany?.nombreFantasia || activeCompany?.razonSocial || 'Tu empresa';

  return (
      <>
        <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Panel de Control</h1>
          <p className="text-emerald-200/70 text-sm mt-1">
            {user.isSuperAdmin
              ? 'Vista global del sistema y accesos administrativos básicos.'
              : `Resumen de asistencia de ${activeCompanyName}.`}
          </p>
        </div>

        {user.isSuperAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link
              href="/admin/companies"
              className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-gray-200 hover:border-emerald-300 transition-colors"
            >
              <p className="text-sm font-semibold text-gray-900">Gestión de empresas</p>
              <p className="text-sm text-gray-500 mt-2">
                Alta, edición y estado general de las empresas registradas.
              </p>
            </Link>
            <Link
              href="/admin/devices"
              className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-gray-200 hover:border-emerald-300 transition-colors"
            >
              <p className="text-sm font-semibold text-gray-900">Dispositivos globales</p>
              <p className="text-sm text-gray-500 mt-2">
                Revisá relojes detectados, no asignados y su vínculo con cada empresa.
              </p>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 mb-8">
          <StatCard label="Presentes hoy" value={summary.presentToday} color="text-emerald-600" />
          <StatCard label="Fichadas hoy" value={summary.recordsToday} color="text-blue-600" />
          <StatCard label="Online" value={summary.devicesOnline} color="text-green-600" />
          <StatCard label="Offline" value={summary.devicesOffline} color="text-slate-600" />
          <InfoCard label="Última sync" value={formatOptionalDate(summary.lastSyncAt)} />
          <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Novedades técnicas</p>
            {summary.technicalNews.map((item) => (
              <p key={item} className="text-xs text-gray-600 leading-relaxed">
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard label="Registros Hoy" value={stats.totalToday} color="text-blue-600" />
          <StatCard label="Registros Esta Semana" value={stats.totalWeek} color="text-green-600" />
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Dispositivos</p>
            <p className="text-3xl font-bold text-purple-600">{devices.length}</p>
            {devices.map((d) => (
              <p key={d.id} className="text-xs text-gray-400 mt-1 truncate">
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

        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Últimos 20 Registros</h2>
            <Link href="/records" className="text-blue-600 text-sm hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-xs uppercase"
                  style={{
                    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
                    color: '#475569',
                  }}
                >
                  <th className="px-6 py-4 text-left font-semibold">Usuario</th>
                  <th className="px-6 py-4 text-left font-semibold">Fecha y Hora</th>
                  <th className="px-6 py-4 text-left font-semibold">Estado</th>
                  <th className="px-6 py-4 text-left font-semibold">Verificación</th>
                  <th className="px-6 py-4 text-left font-semibold">Dispositivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                      No hay registros aún. El reloj enviará datos cuando detecte fichajes.
                    </td>
                  </tr>
                ) : (
                  recent.map((r) => (
                    <tr key={r.id} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{formatAttendanceUser(r)}</div>
                        {r.employee && <div className="text-xs text-gray-500 mt-1">{r.userId}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(r.timestamp)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500">{VERIFY_LABELS[r.verifyType] ?? r.verifyType}</td>
                      <td className="px-6 py-4 text-gray-400 text-xs">{r.deviceSn}</td>
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
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
