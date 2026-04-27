'use client';

import { useState, useTransition } from 'react';
import type { Device } from '@/lib/api';
import type { DeviceSyncActionResult } from '@/app/(protected)/records/actions';
import { requestDeviceForceSyncAction } from '@/app/(protected)/records/actions';

type BannerState =
  | { type: 'success' | 'error' | 'info'; text: string }
  | null;

const TZ = 'America/Argentina/Buenos_Aires';

function formatLastSeen(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

export function RecordsSyncControls({
  devices,
  canSync,
}: {
  devices: Device[];
  canSync: boolean;
}) {
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

  void activeDevices;

  const handleSync = () => {
    if (!selectedDevice || selectedDevice.isActive === false) {
      setBanner({ type: 'error', text: 'No hay un dispositivo activo disponible para sincronizar.' });
      return;
    }
    setBanner(null);
    startTransition(() => {
      void requestDeviceForceSyncAction(selectedDevice.id)
        .then((result: DeviceSyncActionResult) => {
          if (result.error) { setBanner({ type: 'error', text: result.error }); return; }
          setBanner({
            type: result.duplicate ? 'info' : 'success',
            text: result.message || (result.duplicate ? 'Ya existía una sincronización pendiente para este reloj.' : 'Sincronización solicitada correctamente.'),
          });
        })
        .catch(() => { setBanner({ type: 'error', text: 'No se pudo solicitar la sincronización del reloj.' }); });
    });
  };

  if (devices.length === 0) {
    return (
      <section className="card rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Actualizar desde reloj</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Todavía no hay dispositivos registrados. El MB360 aparecerá acá cuando se conecte al endpoint ADMS.
        </p>
      </section>
    );
  }

  return (
    <section className="card rounded-xl p-4 mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Actualizar desde reloj</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            La solicitud queda en cola en el backend y el MB360 la retira en su próximo heartbeat por ADMS.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-[260px]">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Dispositivo</label>
            <select
              value={selectedDevice ? String(selectedDevice.id) : ''}
              onChange={(event) => setSelectedDeviceId(event.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id} disabled={device.isActive === false}>
                  {device.name || device.serialNumber}
                  {' · '}
                  {device.online ? 'online' : 'offline'}
                  {device.isActive === false ? ' · inactivo' : ''}
                </option>
              ))}
            </select>
            {selectedDevice && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {selectedDevice.serialNumber} · {selectedDevice.ipAddress || 'sin IP'} · Último contacto{' '}
                {formatLastSeen(selectedDevice.lastSeen)} · Pendientes {selectedDevice.pendingCommandsCount}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={isPending || !canSync || !selectedDevice || selectedDevice.isActive === false}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <SyncIcon />
            {!canSync ? 'Sin permisos para sincronizar' : isPending ? 'Solicitando...' : 'Actualizar desde reloj'}
          </button>
        </div>
      </div>

      {!canSync && (
        <div className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--amber-soft)', borderColor: 'rgba(251,191,36,0.3)', color: 'var(--amber-text)' }}>
          Tu rol actual permite consultar registros, pero no solicitar sincronizaciones manuales.
        </div>
      )}

      {banner && (
        <div className="mt-4 rounded-lg border px-4 py-3 text-sm" style={
          banner.type === 'success'
            ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
            : banner.type === 'info'
            ? { background: 'var(--blue-soft)', borderColor: 'rgba(59,130,246,0.3)', color: 'var(--blue-text)' }
            : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
        }>
          {banner.text}
        </div>
      )}
    </section>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M20 5v5h-5M4 19v-5h5M6.5 9A7 7 0 0 1 18 6.5L20 10M4 14l2 3.5A7 7 0 0 0 17.5 15"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
