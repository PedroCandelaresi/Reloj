import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { formatAttendanceUser, getDevices, getRecent, getStats, VERIFY_LABELS } from '@/lib/api';
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

export default async function DashboardPage() {
  const [stats, recent, devices] = await Promise.all([
    getStats(),
    getRecent(),
    getDevices(),
  ]);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de asistencia del reloj MB360</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard label="Registros Hoy" value={stats.totalToday} color="text-blue-600" />
          <StatCard label="Registros Esta Semana" value={stats.totalWeek} color="text-green-600" />
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Dispositivos</p>
            <p className="text-3xl font-bold text-purple-600">{devices.length}</p>
            {devices.map((d) => (
              <p key={d.id} className="text-xs text-gray-400 mt-1 truncate">
                {d.serialNumber} · {d.ipAddress} · {formatLastSeen(d.lastSeen)}
              </p>
            ))}
          </div>
        </div>

        {/* Recent records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Últimos 20 Registros</h2>
            <Link href="/records" className="text-blue-600 text-sm hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-6 py-3 text-left">Usuario</th>
                  <th className="px-6 py-3 text-left">Fecha y Hora</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-left">Verificación</th>
                  <th className="px-6 py-3 text-left">Dispositivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">
                      No hay registros aún. El reloj enviará datos cuando detecte fichajes.
                    </td>
                  </tr>
                ) : (
                  recent.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">{formatAttendanceUser(r)}</div>
                        {r.employee && <div className="text-xs text-gray-400 mt-1">{r.userId}</div>}
                      </td>
                      <td className="px-6 py-3 text-gray-600">{formatDate(r.timestamp)}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-3 text-gray-500">{VERIFY_LABELS[r.verifyType] ?? r.verifyType}</td>
                      <td className="px-6 py-3 text-gray-400 text-xs">{r.deviceSn}</td>
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
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
