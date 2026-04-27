'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminDevice, CompanySummary } from '@/lib/api';
import type { AdminDeviceActionResult } from '@/app/(protected)/admin/devices/actions';
import {
  assignDeviceCompanyAction,
  unassignDeviceCompanyAction,
  sendDeviceCommandAction,
} from '@/app/(protected)/admin/devices/actions';

type BannerState = { type: 'success' | 'error'; text: string } | null;

type AssignDraft = {
  companyId: string;
  alias: string;
  address: string;
  email: string;
  phone: string;
};

const TZ = 'America/Argentina/Buenos_Aires';

function formatDate(iso: string) {
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

function getCompanyLabel(company?: CompanySummary | null) {
  if (!company) return 'Sin asignar';
  return company.nombreFantasia || company.razonSocial;
}

const COMMANDS = [
  { type: 'attendance_sync', label: 'Sincronizar fichadas',  description: 'Solicita al reloj que envíe todos los registros de asistencia pendientes.' },
  { type: 'set_time',        label: 'Sincronizar hora',      description: 'Envía la hora actual del servidor al reloj para corregir desfasajes.' },
  { type: 'check',           label: 'Verificar conexión',    description: 'Envía un ping al reloj para confirmar que responde al protocolo ADMS.' },
  { type: 'reboot',          label: 'Reiniciar reloj',       description: 'Ordena al reloj que se reinicie. Puede tardar 1–2 minutos.' },
  { type: 'clear_attlog',    label: 'Borrar registros',      description: 'Elimina TODOS los registros de asistencia almacenados en el reloj. Irreversible.' },
];

function CommandsModal({
  device,
  onClose,
}: {
  device: AdminDevice;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sentCmd, setSentCmd] = useState<string | null>(null);

  const send = (commandType: string, label: string) => {
    if (commandType === 'clear_attlog') {
      if (!confirm(`¿Seguro que querés borrar TODOS los registros del reloj ${device.serialNumber}? Esta acción es irreversible.`)) return;
    }
    setResult(null);
    setSentCmd(commandType);
    startTransition(async () => {
      const r = await sendDeviceCommandAction(device.id, commandType);
      setResult({ type: r.error ? 'error' : 'success', text: r.error ?? `Comando "${label}" encolado. El reloj lo recibirá en el próximo heartbeat.` });
      setSentCmd(null);
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Comandos ADMS</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {device.alias || device.serialNumber}
              {device.company && <span className="ml-2 text-gray-400">· {getCompanyLabel(device.company)}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {result && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${
              result.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {result.text}
            </div>
          )}

          {COMMANDS.map((cmd) => (
            <div key={cmd.type} className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{cmd.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cmd.description}</p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => send(cmd.type, cmd.label)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                  cmd.type === 'clear_attlog'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : cmd.type === 'reboot'
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {sentCmd === cmd.type ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 pb-5">
          <p className="text-xs text-gray-400">
            Los comandos se entregan al reloj en su próximo ciclo de heartbeat (cada 30–120 s según configuración del dispositivo).
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminDevicesManager({
  devices,
  companies,
}: {
  devices: AdminDevice[];
  companies: CompanySummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState<BannerState>(null);
  const [drafts, setDrafts] = useState<Record<number, AssignDraft>>({});
  const [commandsDevice, setCommandsDevice] = useState<AdminDevice | null>(null);

  const unassignedDevices = useMemo(() => devices.filter((d) => !d.companyId), [devices]);
  const assignedDevices   = useMemo(() => devices.filter((d) =>  d.companyId), [devices]);
  const activeCompanies   = useMemo(() => companies.filter((c) => c.isActive),  [companies]);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        unassignedDevices.map((d) => [
          d.id,
          { companyId: '', alias: '', address: '', email: '', phone: '' },
        ]),
      ),
    );
  }, [unassignedDevices]);

  const handleDraftChange = (deviceId: number, field: keyof AssignDraft, value: string) => {
    setDrafts((cur) => ({
      ...cur,
      [deviceId]: {
        companyId: cur[deviceId]?.companyId ?? '',
        alias:     cur[deviceId]?.alias     ?? '',
        address:   cur[deviceId]?.address   ?? '',
        email:     cur[deviceId]?.email     ?? '',
        phone:     cur[deviceId]?.phone     ?? '',
        [field]: value,
      },
    }));
  };

  const handleAssign = (device: AdminDevice) => {
    const draft = drafts[device.id];
    if (!draft?.companyId) {
      setBanner({ type: 'error', text: 'Seleccioná una empresa.' });
      return;
    }
    setBanner(null);
    startTransition(() => {
      void assignDeviceCompanyAction({
        deviceId:  device.id,
        companyId: draft.companyId,
        alias:     draft.alias    || null,
        address:   draft.address  || null,
        email:     draft.email    || null,
        phone:     draft.phone    || null,
      }).then((r: AdminDeviceActionResult) => {
        if (r.error) { setBanner({ type: 'error', text: r.error }); return; }
        setBanner({ type: 'success', text: `Dispositivo ${device.serialNumber} asignado correctamente.` });
        router.refresh();
      }).catch(() => setBanner({ type: 'error', text: 'No se pudo asignar el dispositivo.' }));
    });
  };

  const handleUnassign = (device: AdminDevice) => {
    if (!confirm(`¿Desasignar ${device.serialNumber} de "${getCompanyLabel(device.company)}"? El dispositivo quedará disponible para una nueva asignación.`)) return;
    setBanner(null);
    startTransition(() => {
      void unassignDeviceCompanyAction(device.id)
        .then((r: AdminDeviceActionResult) => {
          if (r.error) { setBanner({ type: 'error', text: r.error }); return; }
          setBanner({ type: 'success', text: `Dispositivo ${device.serialNumber} desasignado.` });
          router.refresh();
        })
        .catch(() => setBanner({ type: 'error', text: 'No se pudo desasignar.' }));
    });
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard label="Total de dispositivos"  value={String(devices.length)} />
        <InfoCard label="Sin asignar"            value={String(unassignedDevices.length)} />
        <InfoCard label="Empresas activas"       value={String(activeCompanies.length)} />
      </section>

      {banner && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          banner.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.text}
        </div>
      )}

      {/* ── Sin asignar ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Relojes sin asignar</h2>
          <p className="text-sm text-gray-500 mt-1">Completá los datos y seleccioná la empresa para activar el reloj.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase" style={{ background: 'linear-gradient(180deg,#f8fafc,#e2e8f0 50%,#cbd5e1)', color: '#475569' }}>
                <th className="px-6 py-4 text-left font-semibold">Serial</th>
                <th className="px-6 py-4 text-left font-semibold">IP</th>
                <th className="px-6 py-4 text-left font-semibold">Último contacto</th>
                <th className="px-6 py-4 text-left font-semibold">Datos de asignación</th>
                <th className="px-6 py-4 text-left font-semibold">Empresa</th>
                <th className="px-6 py-4 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {unassignedDevices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No hay dispositivos pendientes.</td></tr>
              ) : (
                unassignedDevices.map((device) => {
                  const draft = drafts[device.id] ?? { companyId: '', alias: '', address: '', email: '', phone: '' };
                  return (
                    <tr key={device.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{device.serialNumber}</td>
                      <td className="px-6 py-4 text-gray-500">{device.ipAddress || '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(device.lastSeen)}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 min-w-[210px]">
                          <input value={draft.alias}   onChange={(e) => handleDraftChange(device.id, 'alias',   e.target.value)} placeholder="Alias / nombre"     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <input value={draft.address} onChange={(e) => handleDraftChange(device.id, 'address', e.target.value)} placeholder="Dirección / sucursal" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <input value={draft.email}   onChange={(e) => handleDraftChange(device.id, 'email',   e.target.value)} placeholder="Email de contacto" type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <input value={draft.phone}   onChange={(e) => handleDraftChange(device.id, 'phone',   e.target.value)} placeholder="Teléfono"          type="tel"   className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={draft.companyId}
                          onChange={(e) => handleDraftChange(device.id, 'companyId', e.target.value)}
                          className="w-full min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar empresa</option>
                          {activeCompanies.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombreFantasia || c.razonSocial}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={isPending || !draft.companyId}
                          onClick={() => handleAssign(device)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          Asignar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Asignados ───────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Relojes asignados</h2>
          <p className="text-sm text-gray-500 mt-1">La asignación es fija. Para cambiarla, desasignar y volver a configurar.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase" style={{ background: 'linear-gradient(180deg,#f8fafc,#e2e8f0 50%,#cbd5e1)', color: '#475569' }}>
                <th className="px-6 py-4 text-left font-semibold">Serial</th>
                <th className="px-6 py-4 text-left font-semibold">Empresa</th>
                <th className="px-6 py-4 text-left font-semibold">Alias / Dirección</th>
                <th className="px-6 py-4 text-left font-semibold">IP</th>
                <th className="px-6 py-4 text-left font-semibold">Estado</th>
                <th className="px-6 py-4 text-left font-semibold">Último contacto</th>
                <th className="px-6 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignedDevices.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500">No hay dispositivos asignados.</td></tr>
              ) : (
                assignedDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{device.serialNumber}</td>
                    <td className="px-6 py-4 text-gray-700">{getCompanyLabel(device.company)}</td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 font-medium">{device.alias || '—'}</p>
                      {device.address && <p className="text-gray-400 text-xs mt-0.5">{device.address}</p>}
                      {device.email   && <p className="text-gray-400 text-xs">{device.email}</p>}
                      {device.phone   && <p className="text-gray-400 text-xs">{device.phone}</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{device.ipAddress || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        device.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {device.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(device.lastSeen)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCommandsDevice(device)}
                          className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-xs font-medium text-white transition-colors"
                        >
                          Comandos
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleUnassign(device)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Desasignar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {commandsDevice && (
        <CommandsModal device={commandsDevice} onClose={() => setCommandsDevice(null)} />
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-gray-200">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-emerald-700">{value}</p>
    </div>
  );
}
