import Link from 'next/link';
import { formatAttendanceUserOption, type AttendanceUserOption, type Device } from '@/lib/api';

export function ReportFilters({
  action,
  userOptions,
  devices = [],
  dateFrom,
  dateTo,
  employeeId,
  deviceId,
  companyId,
  month,
  year,
  mode = 'range',
}: {
  action: string;
  userOptions: AttendanceUserOption[];
  devices?: Device[];
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  deviceId?: string;
  companyId?: string;
  month?: string;
  year?: string;
  mode?: 'range' | 'month';
}) {
  return (
    <form method="get" action={action} className="card mb-6 flex flex-wrap items-end gap-4 rounded-xl p-4">
      {companyId && <input type="hidden" name="companyId" value={companyId} />}

      {mode === 'range' ? (
        <>
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Desde</label>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Hasta</label>
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Año</label>
            <input
              type="number"
              min="2000"
              max="2100"
              name="year"
              defaultValue={year}
              className="w-28 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Mes</label>
            <input
              type="number"
              min="1"
              max="12"
              name="month"
              defaultValue={month}
              className="w-24 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
        </>
      )}

      <div>
        <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Empleado</label>
        <select
          name="employeeId"
          defaultValue={employeeId}
          className="min-w-56 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

      {mode === 'range' && devices.length > 0 && (
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Reloj</label>
          <select
            name="deviceId"
            defaultValue={deviceId}
            className="min-w-48 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="">Todos</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.alias || device.serialNumber}
              </option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700">
        Filtrar
      </button>
      <Link
        href={action}
        className="rounded-lg px-4 py-2 text-sm transition-colors"
        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        Limpiar
      </Link>
    </form>
  );
}
