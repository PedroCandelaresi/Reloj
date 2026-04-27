'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminDevice, CompanySummary } from '@/lib/api';
import type { AdminDeviceActionResult } from '@/app/(protected)/admin/devices/actions';
import {
  assignDeviceCompanyAction,
  unassignDeviceCompanyAction,
} from '@/app/(protected)/admin/devices/actions';

type BannerState =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

type DeviceDraft = {
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
  if (!company) {
    return 'Sin asignar';
  }

  return company.nombreFantasia || company.razonSocial;
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
  const [drafts, setDrafts] = useState<Record<number, DeviceDraft>>({});

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        devices.map((device) => [
          device.id,
          {
            companyId: device.companyId ?? '',
            alias: device.alias ?? '',
            address: device.address ?? '',
            email: device.email ?? '',
            phone: device.phone ?? '',
          },
        ]),
      ),
    );
  }, [devices]);

  const activeCompanies = useMemo(
    () => companies.filter((company) => company.isActive),
    [companies],
  );
  const unassignedDevices = useMemo(
    () => devices.filter((device) => !device.companyId),
    [devices],
  );

  const handleDraftChange = (
    deviceId: number,
    field: keyof DeviceDraft,
    value: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [deviceId]: {
        companyId: current[deviceId]?.companyId ?? '',
        alias: current[deviceId]?.alias ?? '',
        address: current[deviceId]?.address ?? '',
        email: current[deviceId]?.email ?? '',
        phone: current[deviceId]?.phone ?? '',
        [field]: value,
      },
    }));
  };

  const handleAssign = (device: AdminDevice) => {
    const draft = drafts[device.id] ?? {
      companyId: device.companyId ?? '',
      alias: device.alias ?? '',
      address: device.address ?? '',
      email: device.email ?? '',
      phone: device.phone ?? '',
    };

    if (!draft.companyId) {
      setBanner({ type: 'error', text: 'Seleccioná una empresa para asignar el dispositivo.' });
      return;
    }

    setBanner(null);

    startTransition(() => {
      void assignDeviceCompanyAction({
        deviceId: device.id,
        companyId: draft.companyId,
        alias: draft.alias || null,
        address: draft.address || null,
        email: draft.email || null,
        phone: draft.phone || null,
      })
        .then((result: AdminDeviceActionResult) => {
          if (result.error) {
            setBanner({ type: 'error', text: result.error });
            return;
          }

          setBanner({
            type: 'success',
            text: `Dispositivo ${device.serialNumber} actualizado correctamente.`,
          });
          router.refresh();
        })
        .catch(() => {
          setBanner({ type: 'error', text: 'No se pudo actualizar el dispositivo.' });
        });
    });
  };

  const handleUnassign = (device: AdminDevice) => {
    setBanner(null);

    if (!window.confirm(`¿Desasignar ${device.serialNumber} de su empresa actual?`)) {
      return;
    }

    startTransition(() => {
      void unassignDeviceCompanyAction(device.id)
        .then((result: AdminDeviceActionResult) => {
          if (result.error) {
            setBanner({ type: 'error', text: result.error });
            return;
          }

          setBanner({
            type: 'success',
            text: `Dispositivo ${device.serialNumber} desasignado correctamente.`,
          });
          router.refresh();
        })
        .catch(() => {
          setBanner({ type: 'error', text: 'No se pudo desasignar el dispositivo.' });
        });
    });
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard label="Total de dispositivos" value={String(devices.length)} />
        <InfoCard label="Sin asignar" value={String(unassignedDevices.length)} />
        <InfoCard label="Empresas activas" value={String(activeCompanies.length)} />
      </section>

      {banner && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      {activeCompanies.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          Todavía no hay empresas activas disponibles para asignar dispositivos.
        </div>
      )}

      <section className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Relojes sin asignar</h2>
          <p className="text-sm text-gray-500 mt-1">
            Detectados por ADMS, pendientes de asociar a una empresa.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs uppercase"
                style={{
                  background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
                  color: '#475569',
                }}
              >
                <th className="px-6 py-4 text-left font-semibold">Serial</th>
                <th className="px-6 py-4 text-left font-semibold">Alias</th>
                <th className="px-6 py-4 text-left font-semibold">IP</th>
                <th className="px-6 py-4 text-left font-semibold">Último contacto</th>
                <th className="px-6 py-4 text-left font-semibold">Asignar a</th>
                <th className="px-6 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {unassignedDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No hay dispositivos pendientes de asignación.
                  </td>
                </tr>
              ) : (
                unassignedDevices.map((device) => {
                  const draft = drafts[device.id] ?? { companyId: '', alias: '', address: '', email: '', phone: '' };

                  return (
                    <tr key={device.id} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{device.serialNumber}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 min-w-[200px]">
                          <input
                            value={draft.alias}
                            onChange={(e) => handleDraftChange(device.id, 'alias', e.target.value)}
                            placeholder="Alias / nombre"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            value={draft.address}
                            onChange={(e) => handleDraftChange(device.id, 'address', e.target.value)}
                            placeholder="Dirección / sucursal"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            value={draft.email}
                            type="email"
                            onChange={(e) => handleDraftChange(device.id, 'email', e.target.value)}
                            placeholder="Email de contacto"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            value={draft.phone}
                            type="tel"
                            onChange={(e) => handleDraftChange(device.id, 'phone', e.target.value)}
                            placeholder="Teléfono"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{device.ipAddress || '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(device.lastSeen)}</td>
                      <td className="px-6 py-4">
                        <select
                          value={draft.companyId}
                          onChange={(event) =>
                            handleDraftChange(device.id, 'companyId', event.target.value)
                          }
                          className="w-full min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar empresa</option>
                          {activeCompanies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.nombreFantasia || company.razonSocial}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isPending || !draft.companyId}
                            onClick={() => handleAssign(device)}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            Asignar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Todos los dispositivos</h2>
          <p className="text-sm text-gray-500 mt-1">
            Vista global con empresa actual, alias y estado operativo.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs uppercase"
                style={{
                  background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
                  color: '#475569',
                }}
              >
                <th className="px-6 py-4 text-left font-semibold">Serial</th>
                <th className="px-6 py-4 text-left font-semibold">Empresa</th>
                <th className="px-6 py-4 text-left font-semibold">Alias</th>
                <th className="px-6 py-4 text-left font-semibold">IP</th>
                <th className="px-6 py-4 text-left font-semibold">Estado</th>
                <th className="px-6 py-4 text-left font-semibold">Último contacto</th>
                <th className="px-6 py-4 text-left font-semibold">Reasignar</th>
                <th className="px-6 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    No hay dispositivos registrados todavía.
                  </td>
                </tr>
              ) : (
                devices.map((device) => {
                  const draft = drafts[device.id] ?? {
                    companyId: device.companyId ?? '',
                    alias: device.alias ?? '',
                    address: device.address ?? '',
                    email: device.email ?? '',
                    phone: device.phone ?? '',
                  };

                  return (
                    <tr key={device.id} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{device.serialNumber}</td>
                      <td className="px-6 py-4 text-gray-700">{getCompanyLabel(device.company)}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 min-w-[200px]">
                          <input
                            value={draft.alias}
                            onChange={(e) => handleDraftChange(device.id, 'alias', e.target.value)}
                            placeholder="Alias / nombre"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            value={draft.address}
                            onChange={(e) => handleDraftChange(device.id, 'address', e.target.value)}
                            placeholder="Dirección / sucursal"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            value={draft.email}
                            type="email"
                            onChange={(e) => handleDraftChange(device.id, 'email', e.target.value)}
                            placeholder="Email de contacto"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            value={draft.phone}
                            type="tel"
                            onChange={(e) => handleDraftChange(device.id, 'phone', e.target.value)}
                            placeholder="Teléfono"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{device.ipAddress || '—'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            device.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {device.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(device.lastSeen)}</td>
                      <td className="px-6 py-4">
                        <select
                          value={draft.companyId}
                          onChange={(event) =>
                            handleDraftChange(device.id, 'companyId', event.target.value)
                          }
                          className="w-full min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sin asignar</option>
                          {activeCompanies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.nombreFantasia || company.razonSocial}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleAssign(device)}
                            disabled={isPending || !draft.companyId}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            Guardar
                          </button>
                          {device.companyId && (
                            <button
                              type="button"
                              onClick={() => handleUnassign(device)}
                              disabled={isPending}
                              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                              Desasignar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
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
