import Link from 'next/link';
import type { AttendanceUserOption, Department, Device, Position } from '@/lib/api';
import { MaskedDateInput } from '@/components/MaskedDateInput';
import { formatAttendanceUserOption } from '@/lib/format-employee';
import { getCompanyDeviceName } from '@/lib/ux-labels';

export function ReportFilters({
  action,
  userOptions,
  devices = [],
  departments = [],
  positions = [],
  dateFrom,
  dateTo,
  employeeId,
  deviceId,
  companyId,
  departmentId,
  positionId,
  includeInactive,
  justification,
  showJustificationFilter = false,
  month,
  year,
  mode = 'range',
}: {
  action: string;
  userOptions: AttendanceUserOption[];
  devices?: Device[];
  departments?: Department[];
  positions?: Position[];
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  deviceId?: string;
  companyId?: string;
  departmentId?: string;
  positionId?: string;
  includeInactive?: string;
  justification?: string;
  showJustificationFilter?: boolean;
  month?: string;
  year?: string;
  mode?: 'range' | 'month';
}) {
  const clearHref = companyId ? `${action}?companyId=${encodeURIComponent(companyId)}` : action;
  const hasAdvancedValue = Boolean(
    deviceId ||
    departmentId ||
    positionId ||
    includeInactive === 'true' ||
    (showJustificationFilter && justification && justification !== 'all'),
  );

  return (
    <form method="get" action={action} className="card mb-6 rounded-xl p-4">
      {companyId && <input type="hidden" name="companyId" value={companyId} />}

      <div className="flex flex-wrap items-end gap-4">
        {mode === 'range' ? (
          <>
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Desde</label>
              <MaskedDateInput name="dateFrom" defaultValue={dateFrom} />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Hasta</label>
              <MaskedDateInput name="dateTo" defaultValue={dateTo} />
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
            className="max-w-full min-w-56 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700">
          Ver reporte
        </button>
        <Link
          href={clearHref}
          className="rounded-lg px-4 py-2 text-sm transition-colors"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Limpiar
        </Link>
      </div>

      <details open={hasAdvancedValue} className="mt-4">
        <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--brand-text)' }}>
          Filtros avanzados
        </summary>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          {mode === 'range' && devices.length > 0 && (
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Reloj</label>
              <select
                name="deviceId"
                defaultValue={deviceId}
                className="max-w-full min-w-48 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              >
                <option value="">Todos</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {getCompanyDeviceName(device)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {departments.length > 0 && (
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Sector</label>
              <select
                name="departmentId"
                defaultValue={departmentId}
                className="max-w-full min-w-48 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              >
                <option value="">Todos</option>
                {departments.filter((department) => department.isActive).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {positions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Puesto</label>
              <select
                name="positionId"
                defaultValue={positionId}
                className="max-w-full min-w-48 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              >
                <option value="">Todos</option>
                {positions.filter((position) => position.isActive).map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showJustificationFilter && (
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Justificación</label>
              <select
                name="justification"
                defaultValue={justification || 'all'}
                className="max-w-full min-w-48 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              >
                <option value="all">Todas</option>
                <option value="justified">Justificadas</option>
                <option value="unjustified">Sin justificar</option>
                <option value="pending">Pendientes de revisión</option>
              </select>
            </div>
          )}

          <label className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              name="includeInactive"
              value="true"
              defaultChecked={includeInactive === 'true'}
            />
            Incluir inactivos
          </label>
        </div>
      </details>
    </form>
  );
}
