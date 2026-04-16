import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import {
  formatAttendanceUser,
  formatAttendanceUserOption,
  getDistinctUsers,
  getRecords,
  VERIFY_LABELS,
} from '@/lib/api';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function buildQs(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  return qs.toString() ? `?${qs.toString()}` : '';
}

export default async function RecordsPage({ searchParams }: PageProps) {
  const sp      = await searchParams;
  const page     = Number(sp.page ?? 1);
  const userId   = sp.userId   ?? '';
  const dateFrom = sp.dateFrom ?? '';
  const dateTo   = sp.dateTo   ?? '';

  const [result, userOptions] = await Promise.all([
    getRecords({ page, userId, dateFrom, dateTo }),
    getDistinctUsers(),
  ]);

  const filterBase = { userId, dateFrom, dateTo };

  // QS para exportación (sin page, con filtros actuales)
  const exportQs = new URLSearchParams();
  if (userId)   exportQs.set('userId',   userId);
  if (dateFrom) exportQs.set('dateFrom', dateFrom);
  if (dateTo)   exportQs.set('dateTo',   dateTo);
  const exportFilter = exportQs.toString() ? `&${exportQs.toString()}` : '';

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow-md">Todos los Registros</h1>
            <p className="text-emerald-200/70 text-sm mt-1">{result.total} registros encontrados</p>
          </div>

          {/* Botones exportación */}
          <div className="flex gap-2">
            <a
              href={`/api/export?format=excel${exportFilter}`}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <ExcelIcon />
              Exportar Excel
            </a>
            <a
              href={`/api/export?format=pdf${exportFilter}`}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <PdfIcon />
              Exportar PDF
            </a>
          </div>
        </div>

        {/* Filtros */}
        <form
          method="get"
          className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1">Empleado</label>
            <select
              name="userId"
              defaultValue={userId}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {userOptions.map((option) => (
                <option key={option.userId} value={option.userId}>
                  {formatAttendanceUserOption(option)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Filtrar
          </button>
          <Link
            href="/records"
            className="text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg text-sm border border-gray-300 transition-colors"
          >
            Limpiar
          </Link>
        </form>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
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
                {result.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      No hay registros para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  result.data.map((r) => (
                    <tr key={r.id} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{formatAttendanceUser(r)}</div>
                        {r.employee && <div className="text-xs text-gray-500 mt-1">{r.userId}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(r.timestamp)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {VERIFY_LABELS[r.verifyType] ?? r.verifyType}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">{r.deviceSn}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {result.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Página {result.page} de {result.pages}
                <span className="ml-2 text-gray-400">({result.total} registros)</span>
              </span>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link
                    href={`/records${buildQs({ ...filterBase, page: String(result.page - 1) })}`}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Anterior
                  </Link>
                )}
                {result.page < result.pages && (
                  <Link
                    href={`/records${buildQs({ ...filterBase, page: String(result.page + 1) })}`}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Siguiente
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ─── Íconos inline ────────────────────────────────────────────────────────────

function ExcelIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="12" y1="8"  x2="12" y2="18" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13h2a2 2 0 0 1 0 4H9v-4z" />
      <line x1="9" y1="17" x2="9" y2="20" />
    </svg>
  );
}
