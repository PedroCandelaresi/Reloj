import { RecordsSyncControls } from '@/components/RecordsSyncControls';
import { StatusBadge } from '@/components/StatusBadge';
import {
  formatAttendanceUser,
  formatAttendanceUserOption,
  getDevices,
  getDistinctUsers,
  getRecords,
  VERIFY_LABELS,
} from '@/lib/api';
import { requireCurrentSession } from '@/lib/session';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

const TZ = 'America/Argentina/Buenos_Aires';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
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
  const user = await requireCurrentSession();
  const sp      = await searchParams;
  const page     = Number(sp.page ?? 1);
  const userId   = sp.userId   ?? '';
  const dateFrom = sp.dateFrom ?? '';
  const dateTo   = sp.dateTo   ?? '';

  const [result, userOptions, devices] = await Promise.all([
    getRecords({ page, userId, dateFrom, dateTo }),
    getDistinctUsers(),
    getDevices(),
  ]);
  const canCreateRequests = user.isSuperAdmin || user.companyRole === 'company_admin' || user.companyRole === 'operator';

  const filterBase = { userId, dateFrom, dateTo };

  const exportQs = new URLSearchParams();
  if (userId)   exportQs.set('userId',   userId);
  if (dateFrom) exportQs.set('dateFrom', dateFrom);
  if (dateTo)   exportQs.set('dateTo',   dateTo);
  const exportFilter = exportQs.toString() ? `&${exportQs.toString()}` : '';

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Fichadas</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Son las marcaciones recibidas directamente desde el reloj. Todavía no tienen aplicadas reglas de horario, tolerancias ni feriados.
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{result.total} fichadas encontradas</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={`/api/export?format=excel${exportFilter}`}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <ExcelIcon /> Exportar Excel
            </a>
            <a href={`/api/export?format=pdf${exportFilter}`}
              className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <PdfIcon /> Exportar PDF
            </a>
            <a href={`/api/export?format=excel&report=hours${exportFilter}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <ExcelIcon /> Horas Excel
            </a>
            <a href={`/api/export?format=pdf&report=hours${exportFilter}`}
              className="inline-flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <PdfIcon /> Horas PDF
            </a>
          </div>
        </div>

        <RecordsSyncControls
          devices={devices}
          canSync={user.isSuperAdmin || user.companyRole === 'company_admin' || user.companyRole === 'operator'}
        />

        <div className="mb-6 rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--blue-soft)', borderColor: 'rgba(59,130,246,0.25)', color: 'var(--blue-text)' }}>
          Estas son las marcaciones recibidas directamente desde el reloj. Para ver tardanzas, ausencias y horas trabajadas, usá los reportes calculados.
          <span className="mt-1 block">Método de marcación indica cómo el reloj identificó a la persona, por ejemplo huella, tarjeta, rostro o código personal.</span>
        </div>

        {/* Filtros */}
        <form method="get" className="card rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Empleado</label>
            <select name="userId" defaultValue={userId}
              className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
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
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Desde</label>
            <input type="date" name="dateFrom" defaultValue={dateFrom}
              className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Hasta</label>
            <input type="date" name="dateTo" defaultValue={dateTo}
              className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Filtrar
          </button>
          <Link href="/records"
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Limpiar
          </Link>
        </form>

        {/* Tabla */}
        <div className="card rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header-row text-xs uppercase">
                  <th className="px-6 py-4 text-left font-semibold">Usuario</th>
                  <th className="px-6 py-4 text-left font-semibold">Fecha y Hora</th>
                  <th className="px-6 py-4 text-left font-semibold">Tipo de marcación del reloj</th>
                  <th className="px-6 py-4 text-left font-semibold">Método de marcación</th>
                  <th className="px-6 py-4 text-left font-semibold">Reloj</th>
                  {canCreateRequests && <th className="px-6 py-4 text-left font-semibold">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {result.data.length === 0 ? (
                  <tr>
                    <td colSpan={canCreateRequests ? 6 : 5} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                      No hay fichadas para el período seleccionado. Verificá que el reloj esté conectado o cambiá el rango de fechas.
                    </td>
                  </tr>
                ) : (
                  result.data.map((r) => (
                    <tr key={r.id} className="table-row">
                      <td className="px-6 py-4">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatAttendanceUser(r)}</div>
                        {r.employee && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{r.userId}</div>}
                      </td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatDate(r.timestamp)}</td>
                      <td className="px-6 py-4"><StatusBadge status={r.status} label={r.devicePunchStateLabel} /></td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>{VERIFY_LABELS[r.verifyType] ?? r.verifyType}</td>
                      <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>Reloj de asistencia</td>
                      {canCreateRequests && (
                        <td className="px-6 py-4">
                          <Link href={correctionHref(r.id, r.userId, r.timestamp)} className="font-medium" style={{ color: 'var(--brand-text)' }}>
                            Corregir fichada
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {result.pages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between text-sm" style={{ borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Página {result.page} de {result.pages}
                <span className="ml-2" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>({result.total} registros)</span>
              </span>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link href={`/records${buildQs({ ...filterBase, page: String(result.page - 1) })}`}
                    className="px-3 py-1 rounded text-sm transition-colors"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Anterior
                  </Link>
                )}
                {result.page < result.pages && (
                  <Link href={`/records${buildQs({ ...filterBase, page: String(result.page + 1) })}`}
                    className="px-3 py-1 rounded text-sm transition-colors"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
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

function correctionHref(recordId: number, employeeId: string, timestamp: string) {
  const date = argentinaDateKey(timestamp);
  const qs = new URLSearchParams({
    type: 'punch_correction',
    employeeId,
    date,
    dateFrom: date,
    dateTo: date,
    targetAttendanceRecordId: String(recordId),
    fromReport: '1',
  });
  return `/attendance/requests?${qs.toString()}`;
}

function argentinaDateKey(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

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
