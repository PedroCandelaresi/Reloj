import { RecordsSyncControls } from '@/components/RecordsSyncControls';
import { StatusBadge } from '@/components/StatusBadge';
import { MaskedDateInput } from '@/components/MaskedDateInput';
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
  const canCreateRequests = user.isSuperAdmin || user.companyRole === 'company_admin';

  const filterBase = { userId, dateFrom, dateTo };

  const exportQs = new URLSearchParams();
  if (userId)   exportQs.set('userId',   userId);
  if (dateFrom) exportQs.set('dateFrom', dateFrom);
  if (dateTo)   exportQs.set('dateTo',   dateTo);
  const exportFilter = exportQs.toString() ? `&${exportQs.toString()}` : '';

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Asistencia</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Revisá las marcaciones recibidas desde el reloj por huella, rostro, tarjeta o código.
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{result.total} fichadas encontradas</p>
          </div>

          <details className="shrink-0 sm:text-right">
            <summary className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--brand-text)' }}>
              Exportar
            </summary>
            <div className="mt-3 flex flex-col gap-2 rounded-lg border p-3 text-left" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <a href={`/api/export?format=excel${exportFilter}`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
                <ExcelIcon /> Fichadas Excel
              </a>
              <a href={`/api/export?format=pdf${exportFilter}`}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800">
                <PdfIcon /> Fichadas PDF
              </a>
              <a href={`/api/export?format=excel&report=hours${exportFilter}`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                <ExcelIcon /> Horas Excel
              </a>
              <a href={`/api/export?format=pdf&report=hours${exportFilter}`}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700">
                <PdfIcon /> Horas PDF
              </a>
            </div>
          </details>
        </div>

        <div className="mb-6 rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--blue-soft)', borderColor: 'rgba(59,130,246,0.25)', color: 'var(--blue-text)' }}>
          Usá esta vista para controlar marcaciones crudas. Para ausencias, tardanzas y horas trabajadas, abrí los reportes calculados.
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
            <MaskedDateInput name="dateFrom" defaultValue={dateFrom} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Hasta</label>
            <MaskedDateInput name="dateTo" defaultValue={dateTo} />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Ver fichadas
          </button>
          <Link href="/records"
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Limpiar
          </Link>
        </form>

        <details className="mb-6">
          <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--brand-text)' }}>
            Sincronización y estado del reloj
          </summary>
          <div className="mt-4">
            <RecordsSyncControls
              devices={devices}
              canSync={user.isSuperAdmin || user.companyRole === 'company_admin'}
            />
          </div>
        </details>

        {/* Tabla */}
        <div className="card rounded-xl">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Fichadas recibidas</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Quién fichó, cuándo y con qué método.</p>
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
