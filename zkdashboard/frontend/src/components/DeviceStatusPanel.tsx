'use client';

import { useState, useTransition } from 'react';
import type { Device } from '@/lib/api';
import { requestDeviceForceSyncAction } from '@/app/(protected)/records/actions';

const TZ = 'America/Argentina/Buenos_Aires';

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    <section className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Estado de dispositivos</h2>
        <p className="text-sm text-gray-500 mt-1">Heartbeat, sincronización y comandos ADMS.</p>
      </div>

      {message && (
        <div className="mx-6 mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-xs uppercase text-slate-600">
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
          <tbody className="divide-y divide-gray-200">
            {devices.length === 0 ? (
              <tr>
                <td
                  colSpan={canSync ? 8 : 7}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  No hay dispositivos registrados para esta vista.
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr key={device.id} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{device.name}</td>
                  <td className="px-6 py-4 text-gray-600">{device.serialNumber}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {device.company?.nombreFantasia ||
                      device.company?.razonSocial ||
                      (device.companyId ? 'Empresa asignada' : 'Sin empresa')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        device.online
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {device.online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(device.lastSeen)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(device.lastSyncAt)}</td>
                  <td className="px-6 py-4 text-gray-600">{device.pendingCommandsCount}</td>
                  {canSync && (
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => forceSync(device)}
                        disabled={isPending || device.isActive === false}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
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
