'use client';

import { useState, useTransition } from 'react';
import type { Device } from '@/lib/api';
import type { DeviceSyncActionResult } from '@/app/(protected)/records/actions';
import { requestDeviceForceSyncAction } from '@/app/(protected)/records/actions';

type BannerState =
  | { type: 'success' | 'error' | 'info'; text: string }
  | null;

function formatLastSeen(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecordsSyncControls({ devices }: { devices: Device[] }) {
  const activeDevices = devices.filter((device) => device.isActive !== false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    devices[0] ? String(devices[0].id) : '',
  );
  const [banner, setBanner] = useState<BannerState>(null);
  const [isPending, startTransition] = useTransition();

  const selectedDevice =
    devices.find((device) => String(device.id) === selectedDeviceId) ??
    devices[0] ??
    null;

  const handleSync = () => {
    if (!selectedDevice || selectedDevice.isActive === false) {
      setBanner({
        type: 'error',
        text: 'No hay un dispositivo activo disponible para sincronizar.',
      });
      return;
    }

    setBanner(null);

    startTransition(() => {
      void requestDeviceForceSyncAction(selectedDevice.id)
        .then((result: DeviceSyncActionResult) => {
          if (result.error) {
            setBanner({ type: 'error', text: result.error });
            return;
          }

          setBanner({
            type: result.duplicate ? 'info' : 'success',
            text:
              result.message ||
              (result.duplicate
                ? 'Ya existía una sincronización pendiente para este reloj.'
                : 'Sincronización solicitada correctamente.'),
          });
        })
        .catch(() => {
          setBanner({
            type: 'error',
            text: 'No se pudo solicitar la sincronización del reloj.',
          });
        });
    });
  };

  if (devices.length === 0) {
    return (
      <section className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-900">Actualizar desde reloj</h2>
        <p className="text-sm text-gray-500 mt-2">
          Todavía no hay dispositivos registrados. El MB360 aparecerá acá cuando se conecte al
          endpoint ADMS.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-900">Actualizar desde reloj</h2>
          <p className="text-sm text-gray-500 mt-1">
            La solicitud queda en cola en el backend y el MB360 la retira en su próximo heartbeat
            por ADMS.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-[260px]">
            <label className="block text-xs text-gray-500 mb-1">Dispositivo</label>
            <select
              value={selectedDevice ? String(selectedDevice.id) : ''}
              onChange={(event) => setSelectedDeviceId(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {devices.map((device) => (
                <option
                  key={device.id}
                  value={device.id}
                  disabled={device.isActive === false}
                >
                  {device.serialNumber}
                  {device.isActive === false ? ' · inactivo' : ''}
                </option>
              ))}
            </select>
            {selectedDevice && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedDevice.ipAddress || 'sin IP'} · Último contacto{' '}
                {formatLastSeen(selectedDevice.lastSeen)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={isPending || !selectedDevice || selectedDevice.isActive === false}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <SyncIcon />
            {isPending ? 'Solicitando...' : 'Actualizar desde reloj'}
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : banner.type === 'info'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}
    </section>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M20 5v5h-5M4 19v-5h5M6.5 9A7 7 0 0 1 18 6.5L20 10M4 14l2 3.5A7 7 0 0 0 17.5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
