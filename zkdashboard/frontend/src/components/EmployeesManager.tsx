'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type {
  Device,
  DeviceUserMatchStatus,
  DeviceUserReconciliation,
  DeviceUserReconciliationRow,
  Employee,
  ScheduleProfile,
} from '@/lib/api';
import type { ActionResult } from '@/app/(protected)/employees/actions';
import {
  createEmployeeAction,
  deleteEmployeeAction,
  getDeviceUserReconciliationAction,
  queryDeviceUsersAction,
  syncDeviceEmployeeUserAction,
  updateEmployeeAction,
} from '@/app/(protected)/employees/actions';
import { getCompanyDeviceName, humanizeActionError } from '@/lib/ux-labels';

type FormMode = 'create' | 'edit';

type FormValues = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  entryTime: string;
  exitTime: string;
  scheduleProfileId: string;
};

type BannerState =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

const EMPTY_FORM: FormValues = {
  id: '',
  nombre: '',
  apellido: '',
  telefono: '',
  email: '',
  entryTime: '',
  exitTime: '',
  scheduleProfileId: '',
};

const RECONCILIATION_STATUS_LABELS: Record<DeviceUserMatchStatus, string> = {
  matched: 'Sincronizado',
  system_only: 'Solo sistema',
  device_only: 'Solo reloj',
  name_mismatch: 'Nombre distinto',
  pin_conflict: 'Conflicto de N° de usuario',
};

function SummaryTile({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: number;
  helper: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="card rounded-xl p-5">
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="mt-2 text-3xl font-semibold" style={{ color: tone === 'warning' ? '#b45309' : 'var(--text-primary)' }}>{value}</p>
      <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{helper}</p>
    </div>
  );
}

function toFormValues(employee: Employee): FormValues {
  return {
    id: employee.id,
    nombre: employee.nombre,
    apellido: employee.apellido,
    telefono: employee.telefono ?? '',
    email: employee.email ?? '',
    entryTime: employee.entryTime ?? '',
    exitTime: employee.exitTime ?? '',
    scheduleProfileId: employee.scheduleProfileId ?? '',
  };
}

export function EmployeesManager({ employees }: { employees: Employee[] }) {
  return <EmployeesManagerContent employees={employees} scheduleProfiles={[]} devices={[]} canManage />;
}

export function EmployeesManagerContent({
  employees,
  scheduleProfiles,
  devices,
  canManage,
  canQueryDeviceUsers = canManage,
  canRequestDeviceUserQuery = canManage,
  canSyncDeviceUsers = canManage,
}: {
  employees: Employee[];
  scheduleProfiles: ScheduleProfile[];
  devices: Device[];
  canManage: boolean;
  canQueryDeviceUsers?: boolean;
  canRequestDeviceUserQuery?: boolean;
  canSyncDeviceUsers?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<FormMode>('create');
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerState>(null);
  const [syncDeviceId, setSyncDeviceId] = useState(devices[0]?.id ? String(devices[0].id) : '');
  const [reconciliation, setReconciliation] = useState<DeviceUserReconciliation | null>(null);
  const [isReconciliationLoading, setIsReconciliationLoading] = useState(false);
  const [search, setSearch] = useState('');

  const openCreate = () => {
    setMode('create');
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setMode('edit');
    setForm(toFormValues(employee));
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isPending) return;
    setIsModalOpen(false);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setBanner(null);

    const id = form.id.trim();
    const nombre = form.nombre.trim();
    const apellido = form.apellido.trim();
    const telefono = form.telefono.trim();
    const email = form.email.trim();
    const entryTime = form.entryTime.trim();
    const exitTime = form.exitTime.trim();
    const scheduleProfileId = form.scheduleProfileId.trim();

    if (!id || !nombre || !apellido) {
      setFormError('Completá DNI, nombre y apellido.');
      return;
    }
    if (mode === 'edit' && scheduleProfileId) {
      if (!window.confirm('Cambiar el perfil de horario puede afectar los cálculos de períodos anteriores. Después de guardar, recalculá el período actual para ver los cambios. ¿Continuás?')) return;
    }

    startTransition(() => {
      const request =
        mode === 'create'
          ? createEmployeeAction({ id, nombre, apellido, telefono: telefono || null, email: email || null, entryTime: entryTime || null, exitTime: exitTime || null, scheduleProfileId: scheduleProfileId || null })
          : updateEmployeeAction(id, { nombre, apellido, telefono: telefono || null, email: email || null, entryTime: entryTime || null, exitTime: exitTime || null, scheduleProfileId: scheduleProfileId || null });

      void request
        .then((result: ActionResult) => {
          if (result.error) { setFormError(humanizeActionError(result.error)); return; }
          setIsModalOpen(false);
          setForm(EMPTY_FORM);
          setFormError(null);
          setBanner({ type: 'success', text: mode === 'create' ? 'Empleado creado correctamente.' : 'Empleado actualizado correctamente.' });
          router.refresh();
        })
        .catch(() => { setFormError(humanizeActionError('Failed to fetch')); });
    });
  };

  const handleDelete = (employee: Employee) => {
    setBanner(null);
    if (!window.confirm(`¿Eliminar a ${employee.apellido}, ${employee.nombre}?`)) return;

    startTransition(() => {
      void deleteEmployeeAction(employee.id)
        .then((result: ActionResult) => {
          if (result.error) { setBanner({ type: 'error', text: humanizeActionError(result.error) }); return; }
          if (isModalOpen && form.id === employee.id) { setIsModalOpen(false); setForm(EMPTY_FORM); setFormError(null); }
          setBanner({ type: 'success', text: 'Empleado eliminado correctamente.' });
          router.refresh();
        })
        .catch(() => { setBanner({ type: 'error', text: humanizeActionError('Failed to fetch') }); });
    });
  };

  const selectedDeviceId = Number.parseInt(syncDeviceId, 10);

  const loadReconciliation = (deviceId: number) => {
    if (!canQueryDeviceUsers || !Number.isInteger(deviceId) || deviceId <= 0) {
      setReconciliation(null);
      return;
    }

    setIsReconciliationLoading(true);
    startTransition(() => {
      void getDeviceUserReconciliationAction(deviceId)
        .then((result) => {
          if (result.error) {
            setReconciliation(null);
            setBanner({ type: 'error', text: humanizeActionError(result.error) });
            return;
          }
          setReconciliation(result.data ?? null);
        })
        .catch(() => {
          setReconciliation(null);
          setBanner({ type: 'error', text: humanizeActionError('Failed to fetch') });
        })
        .finally(() => {
          setIsReconciliationLoading(false);
        });
    });
  };

  useEffect(() => {
    if (!canQueryDeviceUsers || !Number.isInteger(selectedDeviceId) || selectedDeviceId <= 0) {
      setReconciliation(null);
      return;
    }

    loadReconciliation(selectedDeviceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncDeviceId, canQueryDeviceUsers]);

  const handleImportFromDevice = () => {
    setBanner(null);
    if (!Number.isInteger(selectedDeviceId) || selectedDeviceId <= 0) {
      setBanner({ type: 'error', text: 'Seleccioná un reloj.' });
      return;
    }

    startTransition(() => {
      void queryDeviceUsersAction(selectedDeviceId)
        .then((result: ActionResult) => {
          if (result.error) { setBanner({ type: 'error', text: humanizeActionError(result.error) }); return; }
          setBanner({ type: 'success', text: result.message || 'Consulta de usuarios solicitada al reloj.' });
          loadReconciliation(selectedDeviceId);
        })
        .catch(() => { setBanner({ type: 'error', text: humanizeActionError('Failed to fetch') }); });
    });
  };

  const handleExportToDevice = (employee: Pick<Employee, 'id' | 'apellido' | 'nombre'>) => {
    setBanner(null);
    if (!Number.isInteger(selectedDeviceId) || selectedDeviceId <= 0) {
      setBanner({ type: 'error', text: 'Seleccioná un reloj.' });
      return;
    }
    if (!window.confirm('Se va a enviar este empleado al reloj seleccionado. El empleado podrá fichar cuando el reloj confirme la operación. ¿Continuás?')) return;

    startTransition(() => {
      void syncDeviceEmployeeUserAction(selectedDeviceId, employee.id)
        .then((result: ActionResult) => {
          if (result.error) { setBanner({ type: 'error', text: humanizeActionError(result.error) }); return; }
          setBanner({ type: 'success', text: result.message || 'Empleado encolado para enviar al reloj.' });
          loadReconciliation(selectedDeviceId);
        })
        .catch(() => { setBanner({ type: 'error', text: humanizeActionError('Failed to fetch') }); });
    });
  };

  const reconciliationRows: DeviceUserReconciliationRow[] = reconciliation
    ? [
        ...reconciliation.pinConflicts,
        ...reconciliation.nameMismatches,
        ...reconciliation.deviceOnly,
        ...reconciliation.systemOnly,
        ...reconciliation.matched,
      ]
    : [];
  const employeesWithoutSchedule = employees.filter((employee) => !employee.scheduleProfileId).length;
  const employeesWithContact = employees.filter((employee) => employee.telefono || employee.email).length;
  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) => {
      const values = [
        employee.id,
        employee.apellido,
        employee.nombre,
        employee.telefono,
        employee.email,
        employee.scheduleProfile?.name,
      ];
      return values.some((value) => value?.toLowerCase().includes(term));
    });
  }, [employees, search]);

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryTile label="Empleados cargados" value={employees.length} helper="Personas registradas en esta empresa" />
          <SummaryTile label="Sin horario" value={employeesWithoutSchedule} helper="Revisalos antes de calcular asistencia" tone={employeesWithoutSchedule > 0 ? 'warning' : 'default'} />
          <SummaryTile label="Con datos de contacto" value={employeesWithContact} helper="Tienen teléfono o email cargado" />
        </div>

        <div className="card rounded-xl">
          <div className="px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Lista de empleados</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {canManage
                ? 'Gestioná empleados, horarios y envío al reloj desde una sola vista.'
                : 'Consultá empleados, horarios y estado de sincronización con el reloj.'}
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Agregar empleado
            </button>
          ) : (
            <span className="rounded-lg border px-3 py-2 text-xs font-medium" style={{ background: 'var(--amber-soft)', borderColor: 'rgba(251,191,36,0.3)', color: 'var(--amber-text)' }}>
              Vista de solo lectura
            </span>
          )}
        </div>

        {banner && (
          <div
            className="mx-6 mt-6 rounded-lg border px-4 py-3 text-sm"
            style={
              banner.type === 'success'
                ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
                : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
            }
          >
            {banner.text}
          </div>
        )}

        <div className="px-6 py-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block max-w-md flex-1 text-sm">
            <span className="mb-1 block font-medium" style={{ color: 'var(--text-secondary)' }}>Buscar empleado</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, apellido, N° de usuario, teléfono o email"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </label>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Mostrando {filteredEmployees.length} de {employees.length}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }}>
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="table-header-row text-xs uppercase">
                <th className="w-[28%] px-6 py-5 text-left font-semibold">Empleado</th>
                <th className="w-[25%] px-6 py-5 text-left font-semibold">Contacto</th>
                <th className="w-[16%] px-6 py-5 text-left font-semibold">Horario</th>
                <th className="w-[16%] px-6 py-5 text-left font-semibold">Perfil</th>
                {canManage && <th className="w-[15%] px-6 py-5 text-right font-semibold">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-6 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No hay empleados cargados todavía.</p>
                    <p className="mt-1">Para calcular asistencia, primero cargá empleados o consultá los usuarios del reloj.</p>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-6 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No encontramos empleados con esa búsqueda.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="transition-colors border-t" style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-6 py-5 align-top">
                      <div className="break-words font-medium" style={{ color: 'var(--text-primary)' }}>{employee.apellido}, {employee.nombre}</div>
                      <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>N° de usuario: {employee.id}</div>
                    </td>
                    <td className="px-6 py-5 align-top" style={{ color: 'var(--text-secondary)' }}>
                      <div className="break-words">{employee.telefono || 'Sin teléfono'}</div>
                      <div className="mt-1 break-words text-xs" style={{ color: 'var(--text-muted)' }}>{employee.email || 'Sin email'}</div>
                    </td>
                    <td className="px-6 py-5 align-top" style={{ color: 'var(--text-secondary)' }}>
                      {employee.entryTime || employee.exitTime ? (
                        <span>{employee.entryTime || '--:--'} a {employee.exitTime || '--:--'}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Usa el perfil asignado</span>
                      )}
                    </td>
                    <td className="px-6 py-5 align-top">
                      {employee.scheduleProfile?.name ? (
                        <span className="inline-flex max-w-full rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}>
                          {employee.scheduleProfile.name}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'rgba(245,158,11,0.14)', color: '#b45309' }}>
                          Sin horario
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-6 py-5 align-top">
                        <div className="flex flex-col items-stretch gap-2 xl:flex-row xl:justify-end">
                          <button type="button" onClick={() => openEdit(employee)}
                            className="rounded-lg px-3 py-2 text-xs font-medium transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            Editar
                          </button>
                          <button type="button" onClick={() => handleExportToDevice(employee)} disabled={isPending || devices.length === 0}
                            className="rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}>
                            Enviar al reloj
                          </button>
                          <button type="button" onClick={() => handleDelete(employee)} disabled={isPending}
                            className="rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60" style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)' }}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

        {canQueryDeviceUsers && (
          <div className="card rounded-xl p-5" style={{ border: '1px solid var(--border)' }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Comparar con usuarios del reloj</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Sirve para revisar quién está cargado en el reloj. No importa biometría ni crea empleados automáticamente.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={syncDeviceId}
                  onChange={(event) => setSyncDeviceId(event.target.value)}
                  disabled={isPending || devices.length === 0}
                  className="min-w-[220px] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                >
                  {devices.length === 0 ? (
                    <option value="">Sin relojes asignados</option>
                  ) : (
                    devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {getCompanyDeviceName(device)}
                      </option>
                    ))
                  )}
                </select>
                {canRequestDeviceUserQuery && (
                  <button
                    type="button"
                    onClick={handleImportFromDevice}
                    disabled={isPending || devices.length === 0}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition-colors"
                  >
                    Consultar usuarios del reloj
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>
                Última consulta:{' '}
                {reconciliation?.lastUserInfoSync
                  ? new Date(reconciliation.lastUserInfoSync).toLocaleString('es-AR')
                  : 'sin datos'}
              </span>
              <span>
                Total conciliado: {reconciliationRows.length}
              </span>
              {isReconciliationLoading && <span>Cargando...</span>}
            </div>

            <div className="mt-5 rounded-lg" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="table-header-row text-xs uppercase">
                    <th className="w-[18%] px-4 py-4 text-left font-semibold">N° de usuario</th>
                    <th className="w-[22%] px-4 py-4 text-left font-semibold">Nombre en reloj</th>
                    <th className="w-[24%] px-4 py-4 text-left font-semibold">Empleado del sistema</th>
                    <th className="w-[18%] px-4 py-4 text-left font-semibold">Estado</th>
                    <th className="w-[18%] px-4 py-4 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                        Esta empresa no tiene relojes asignados. Contactá al administrador del sistema para asignar uno.
                      </td>
                    </tr>
                  ) : reconciliationRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                        Todavía no se consultaron los usuarios del reloj. Presioná “Consultar usuarios del reloj” y esperá la próxima comunicación del equipo.
                      </td>
                    </tr>
                  ) : (
                    reconciliationRows.map((row) => (
                      <tr key={`${row.status}-${row.pin}`} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="break-words px-4 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{row.pin}</td>
                        <td className="break-words px-4 py-4" style={{ color: 'var(--text-secondary)' }}>
                          {row.deviceUser?.name || '—'}
                        </td>
                        <td className="break-words px-4 py-4" style={{ color: 'var(--text-secondary)' }}>
                          {row.employee ? `${row.employee.apellido}, ${row.employee.nombre}` : '—'}
                        </td>
                        <td className="px-4 py-4" style={{ color: 'var(--text-muted)' }}>
                          {RECONCILIATION_STATUS_LABELS[row.status]}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {row.status === 'system_only' && row.employee && canSyncDeviceUsers ? (
                            <button
                              type="button"
                              onClick={() => handleExportToDevice(row.employee!)}
                              disabled={isPending}
                              className="font-medium transition-colors disabled:opacity-60"
                              style={{ color: 'var(--brand-text)' }}
                            >
                              Enviar al reloj
                            </button>
                          ) : row.status === 'name_mismatch' && row.employee && canSyncDeviceUsers ? (
                            <button
                              type="button"
                              onClick={() => handleExportToDevice(row.employee!)}
                              disabled={isPending}
                              className="font-medium transition-colors disabled:opacity-60"
                              style={{ color: 'var(--brand-text)' }}
                            >
                              Actualizar reloj
                            </button>
                          ) : row.status === 'device_only' ? (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Revisar / importar manualmente</span>
                          ) : row.status === 'matched' ? (
                            <span className="text-xs" style={{ color: 'var(--brand-text)' }}>Sincronizado</span>
                          ) : (row.status === 'system_only' || row.status === 'name_mismatch') && !canSyncDeviceUsers ? (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Solo lectura</span>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--danger-text)' }}>Revisar N° de usuario</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {canManage && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {mode === 'create' ? 'Agregar empleado' : 'Editar empleado'}
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                El N° de usuario debe coincidir con el número que usa la persona para fichar en el reloj.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }}>
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>N° de usuario / DNI</label>
                <input
                  name="id" value={form.id} onChange={handleChange} required
                  disabled={mode === 'edit'} inputMode="numeric"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Apellido</label>
                  <input name="apellido" value={form.apellido} onChange={handleChange} required
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} required
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Perfil horario</label>
                <select name="scheduleProfileId" value={form.scheduleProfileId} onChange={handleChange}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                >
                  <option value="">Sin perfil asignado</option>
                  {scheduleProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.entryTime} - {profile.exitTime})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Si no elegís un perfil, este empleado no tendrá cálculo de tardanzas, ausencias ni horas esperadas.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Teléfono</label>
                <input name="telefono" value={form.telefono} onChange={handleChange}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Horario de entrada</label>
                  <input name="entryTime" type="text" value={form.entryTime} onChange={handleChange} placeholder="HH:MM" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$" inputMode="numeric"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Horario de salida</label>
                  <input name="exitTime" type="text" value={form.exitTime} onChange={handleChange} placeholder="HH:MM" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$" inputMode="numeric"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={isPending}
                  className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 transition-colors"
                >
                  {isPending ? 'Guardando...' : mode === 'create' ? 'Crear empleado' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
