'use client';

import { useState, useTransition } from 'react';
import type { Device } from '@/lib/api';
import { requestDeviceForceSyncAction } from '@/app/(protected)/records/actions';
import {
  formatLastCommunication,
  getCompanyDeviceModel,
  getCompanyDeviceName,
  getDeviceStatusClasses,
  getDeviceStatusLabel,
  humanizeActionError,
} from '@/lib/ux-labels';

const TZ = 'America/Argentina/Buenos_Aires';

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

export function DeviceStatusPanel({
  devices,
  canSync,
}: {
  devices: Device[];
  canSync: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const forceSync = (device: Device) => {
    setMessage(null);
    startTransition(() => {
      void requestDeviceForceSyncAction(device.id)
        .then((result) => {
          setMessage(result.error ? humanizeActionError(result.error) : result.message || 'Sincronización solicitada.');
        })
        .catch(() => setMessage(humanizeActionError('Failed to fetch')));
    });
  };

  return (
    <section className="card rounded-xl">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Estado de relojes</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Conexión, última comunicación y tareas pendientes de cada reloj.</p>
      </div>

      {message && (
        <div className="mx-6 mt-6 rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--blue-soft)', borderColor: 'rgba(59,130,246,0.3)', color: 'var(--blue-text)' }}>
          {message}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)' }}>
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="w-[18%] px-4 py-5 text-left font-semibold">Reloj</th>
              <th className="w-[12%] px-4 py-5 text-left font-semibold">Modelo</th>
              <th className="w-[15%] px-4 py-5 text-left font-semibold">Estado</th>
              <th className="w-[18%] px-4 py-5 text-left font-semibold">Comunicación</th>
              <th className="w-[17%] px-4 py-5 text-left font-semibold">Sincronización</th>
              <th className="w-[10%] px-4 py-5 text-left font-semibold">Tareas</th>
              {canSync && <th className="w-[10%] px-4 py-5 text-right font-semibold">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={canSync ? 7 : 6} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  Esta empresa no tiene relojes asignados. Contactá al administrador del sistema para asignar uno.
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr key={device.id} className="transition-colors border-t" style={{ borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td className="break-words px-4 py-5 font-medium" style={{ color: 'var(--text-primary)' }}>{getCompanyDeviceName(device)}</td>
                  <td className="px-4 py-5" style={{ color: 'var(--text-secondary)' }}>{getCompanyDeviceModel(device)}</td>
                  <td className="px-4 py-5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getDeviceStatusClasses(device.computedState?.state || device.status)}`}>
                      {getDeviceStatusLabel(device.computedState?.state || device.status)}
                    </span>
                  </td>
                  <td className="px-4 py-5" style={{ color: 'var(--text-muted)' }}>{formatLastCommunication(device)}</td>
                  <td className="px-4 py-5" style={{ color: 'var(--text-muted)' }}>{formatDate(device.lastSyncAt)}</td>
                  <td className="px-4 py-5" style={{ color: 'var(--text-secondary)' }}>
                    <p>{device.pendingCommandsCount} pendientes</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{device.failedCommandsCount ?? 0} fallidos</p>
                  </td>
                  {canSync && (
                    <td className="px-4 py-5 text-right">
                      <button
                        type="button"
                        onClick={() => forceSync(device)}
                        disabled={isPending || device.isActive === false}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-60 transition-colors"
                      >
                        Pedir fichadas
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
