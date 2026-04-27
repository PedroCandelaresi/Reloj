'use client';

import { useState, useTransition } from 'react';
import type { Device } from '@/lib/api';
import { requestDeviceForceSyncAction } from '@/app/(protected)/records/actions';

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
      void requestDeviceForceSyncAction(device.id).then((result) => {
        setMessage(result.error || result.message || 'Sincronización solicitada.');
      });
    });
  };

  return (
    <section className="card rounded-xl">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Estado de dispositivos</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Heartbeat, sincronización y comandos ADMS.</p>
      </div>

      {message && (
        <div className="mx-6 mt-6 rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--blue-soft)', borderColor: 'rgba(59,130,246,0.3)', color: 'var(--blue-text)' }}>
          {message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="px-6 py-4 text-left font-semibold">Dispositivo</th>
              <th className="px-6 py-4 text-left font-semibold">Serial</th>
              <th className="px-6 py-4 text-left font-semibold">Empresa</th>
              <th className="px-6 py-4 text-left font-semibold">Estado</th>
              <th className="px-6 py-4 text-left font-semibold">Última conexión</th>
              <th className="px-6 py-4 text-left font-semibold">Última sync</th>
              <th className="px-6 py-4 text-left font-semibold">Pendientes</th>
              {canSync && <th className="px-6 py-4 text-right font-semibold">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={canSync ? 8 : 7} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  No hay dispositivos registrados para esta vista.
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr key={device.id} className="transition-colors border-t" style={{ borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{device.name}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{device.serialNumber}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>
                    {device.company?.nombreFantasia || device.company?.razonSocial || (device.companyId ? 'Empresa asignada' : 'Sin empresa')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      device.online
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400'
                    }`}>
                      {device.online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>{formatDate(device.lastSeen)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>{formatDate(device.lastSyncAt)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{device.pendingCommandsCount}</td>
                  {canSync && (
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => forceSync(device)}
                        disabled={isPending || device.isActive === false}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-60 transition-colors"
                      >
                        Sincronizar
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
