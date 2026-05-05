'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type {
  Department,
  Device,
  DeviceUserMatchStatus,
  DeviceUserReconciliation,
  DeviceUserReconciliationRow,
  Employee,
  EmployeeImportPreviewResult,
  Position,
  ScheduleProfile,
} from '@/lib/api';
import type { ActionResult } from '@/app/(protected)/employees/actions';
import {
  confirmEmployeeImportAction,
  createEmployeeAction,
  getDeviceUserReconciliationAction,
  previewEmployeeImportAction,
  queryDeviceUsersAction,
  syncDeviceEmployeeUserAction,
  updateEmployeeAction,
} from '@/app/(protected)/employees/actions';
import { formatEmployeeName } from '@/lib/format-employee';
import { getCompanyDeviceName, humanizeActionError } from '@/lib/ux-labels';

type FormMode = 'create' | 'edit';

type FormValues = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  scheduleProfileId: string;
  departmentId: string;
  positionId: string;
  isActive: boolean;
  inactiveReason: string;
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
  scheduleProfileId: '',
  departmentId: '',
  positionId: '',
  isActive: true,
  inactiveReason: '',
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
    scheduleProfileId: employee.scheduleProfileId ?? '',
    departmentId: employee.departmentId ?? '',
    positionId: employee.positionId ?? '',
    isActive: employee.isActive,
    inactiveReason: employee.inactiveReason ?? '',
  };
}

export function EmployeesManager({ employees }: { employees: Employee[] }) {
  return <EmployeesManagerContent employees={employees} scheduleProfiles={[]} departments={[]} positions={[]} devices={[]} canManage />;
}

export function EmployeesManagerContent({
  employees,
  scheduleProfiles,
  departments,
  positions,
  devices,
  canManage,
  canQueryDeviceUsers = canManage,
  canRequestDeviceUserQuery = canManage,
  canSyncDeviceUsers = canManage,
}: {
  employees: Employee[];
  scheduleProfiles: ScheduleProfile[];
  departments: Department[];
  positions: Position[];
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<EmployeeImportPreviewResult | null>(null);
  const [importMessage, setImportMessage] = useState<BannerState>(null);
  const [syncDeviceId, setSyncDeviceId] = useState(devices[0]?.id ? String(devices[0].id) : '');
  const [reconciliation, setReconciliation] = useState<DeviceUserReconciliation | null>(null);
  const [isReconciliationLoading, setIsReconciliationLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

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

  const openImport = () => {
    setIsImportOpen(true);
    setImportPreview(null);
    setImportMessage(null);
  };

  const closeImport = () => {
    if (isPending) return;
    setIsImportOpen(false);
    setImportPreview(null);
    setImportMessage(null);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const nextValue = event.target instanceof HTMLInputElement && event.target.type === 'checkbox'
      ? event.target.checked
      : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
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
    const scheduleProfileId = form.scheduleProfileId.trim();
    const departmentId = form.departmentId.trim();
    const positionId = form.positionId.trim();
    const inactiveReason = form.inactiveReason.trim();

    if (!id || !nombre || !apellido) {
      setFormError('Completá DNI, nombre y apellido.');
      return;
    }
    if (mode === 'edit' && scheduleProfileId) {
      if (!window.confirm('Cambiar el perfil de horario puede afectar los cálculos de períodos anteriores. Después de guardar, recalculá el período actual para ver los cambios. ¿Continuás?')) return;
    }

    startTransition(() => {
      const payload = {
        nombre,
        apellido,
        telefono: telefono || null,
        email: email || null,
        entryTime: null,
        exitTime: null,
        scheduleProfileId: scheduleProfileId || null,
        departmentId: departmentId || null,
        positionId: positionId || null,
        isActive: form.isActive,
        inactiveReason: inactiveReason || null,
      };
      const request = mode === 'create'
        ? createEmployeeAction({ id, ...payload })
        : updateEmployeeAction(id, payload);

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

  const handleToggleActive = (employee: Employee, nextIsActive: boolean) => {
    setBanner(null);
    if (!nextIsActive) {
      const confirmed = window.confirm(
        'Al inactivar un empleado, dejará de aparecer en reportes operativos por defecto, pero se conservará su historial. ¿Continuás?',
      );
      if (!confirmed) return;
    }

    startTransition(() => {
      void updateEmployeeAction(employee.id, {
        nombre: employee.nombre,
        apellido: employee.apellido,
        telefono: employee.telefono,
        email: employee.email,
        entryTime: employee.entryTime,
        exitTime: employee.exitTime,
        scheduleProfileId: employee.scheduleProfileId,
        departmentId: employee.departmentId,
        positionId: employee.positionId,
        isActive: nextIsActive,
        inactiveReason: nextIsActive ? null : employee.inactiveReason ?? 'Inactivado desde la lista de empleados',
      })
        .then((result: ActionResult) => {
          if (result.error) { setBanner({ type: 'error', text: humanizeActionError(result.error) }); return; }
          if (isModalOpen && form.id === employee.id) { setIsModalOpen(false); setForm(EMPTY_FORM); setFormError(null); }
          setBanner({ type: 'success', text: nextIsActive ? 'Empleado reactivado correctamente.' : 'Empleado inactivado correctamente.' });
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

  const handleImportPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImportMessage(null);
    setImportPreview(null);
    const formData = new FormData(event.currentTarget);

    startTransition(() => {
      void previewEmployeeImportAction(formData)
        .then((result) => {
          if (result.error || !result.data) {
            setImportMessage({ type: 'error', text: humanizeActionError(result.error || 'No se pudo previsualizar el archivo.') });
            return;
          }
          setImportPreview(result.data);
          if (result.data.validRows === 0) {
            setImportMessage({ type: 'error', text: 'No se encontraron filas válidas.' });
          } else if (result.data.invalidRows > 0) {
            setImportMessage({ type: 'error', text: 'Hay errores que deben corregirse antes de importar.' });
          } else {
            setImportMessage({ type: 'success', text: 'El archivo está listo para importar. Revisá el preview antes de confirmar.' });
          }
        })
        .catch(() => setImportMessage({ type: 'error', text: humanizeActionError('Failed to fetch') }));
    });
  };

  const handleImportConfirm = () => {
    if (!importPreview?.normalizedRows.length) {
      setImportMessage({ type: 'error', text: 'No hay filas válidas para importar.' });
      return;
    }
    setImportMessage(null);

    startTransition(() => {
      void confirmEmployeeImportAction({ rows: importPreview.normalizedRows })
        .then((result) => {
          if (result.error) {
            setImportMessage({ type: 'error', text: humanizeActionError(result.error) });
            return;
          }
          setImportMessage({
            type: 'success',
            text: result.message || `La importación creó ${result.createdCount ?? 0} empleado(s).`,
          });
          setImportPreview(null);
          router.refresh();
        })
        .catch(() => setImportMessage({ type: 'error', text: humanizeActionError('Failed to fetch') }));
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
  const visibleEmployees = useMemo(
    () => employees.filter((employee) => includeInactive || employee.isActive),
    [employees, includeInactive],
  );
  const activeEmployeesCount = employees.filter((employee) => employee.isActive).length;
  const inactiveEmployeesCount = employees.length - activeEmployeesCount;
  const employeesWithoutSchedule = visibleEmployees.filter((employee) => !employee.scheduleProfileId).length;
  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visibleEmployees;
    return visibleEmployees.filter((employee) => {
      const values = [
        employee.id,
        employee.apellido,
        employee.nombre,
        employee.telefono,
        employee.email,
        employee.scheduleProfile?.name,
        employee.department?.name,
        employee.position?.name,
        employee.isActive ? 'activo' : 'inactivo',
      ];
      return values.some((value) => value?.toLowerCase().includes(term));
    });
  }, [search, visibleEmployees]);

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryTile label="Empleados activos" value={activeEmployeesCount} helper="Personas operativas en esta empresa" />
          <SummaryTile label="Sin horario" value={employeesWithoutSchedule} helper="Revisalos antes de calcular asistencia" tone={employeesWithoutSchedule > 0 ? 'warning' : 'default'} />
          <SummaryTile label="Inactivos" value={inactiveEmployeesCount} helper="Se conservan para historial y reportes" />
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openImport}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Importar empleados
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Agregar empleado
              </button>
            </div>
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
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-4" style={{ color: 'var(--text-muted)' }}>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
              />
              Incluir inactivos
            </label>
            <span>
              Mostrando {filteredEmployees.length} de {visibleEmployees.length}
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }}>
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="table-header-row text-xs uppercase">
                <th className="w-[28%] px-6 py-5 text-left font-semibold">Empleado</th>
                <th className="w-[22%] px-6 py-5 text-left font-semibold">Sector y puesto</th>
                <th className="w-[20%] px-6 py-5 text-left font-semibold">Horario</th>
                <th className="w-[14%] px-6 py-5 text-left font-semibold">Estado</th>
                {canManage && <th className="w-[16%] px-6 py-5 text-right font-semibold">Acciones</th>}
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
                      <div className="mt-2 break-words text-xs" style={{ color: 'var(--text-muted)' }}>
                        {employee.telefono || employee.email ? [employee.telefono, employee.email].filter(Boolean).join(' · ') : 'Sin contacto'}
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top" style={{ color: 'var(--text-secondary)' }}>
                      <div className="break-words">{employee.department?.name || 'Sin sector'}</div>
                      <div className="mt-1 break-words text-xs" style={{ color: 'var(--text-muted)' }}>{employee.position?.name || 'Sin puesto'}</div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      {employee.scheduleProfile?.name ? (
                        <span className="inline-flex max-w-full rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}>
                          {employee.scheduleProfile.name}
                        </span>
                      ) : (
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-xs font-medium cursor-help"
                          style={{ background: 'rgba(245,158,11,0.14)', color: '#b45309' }}
                          title="Sin perfil horario asignado. No se calcularán tardanzas, ausencias ni cierre mensual hasta asignarle uno."
                        >
                          Sin perfil horario
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 align-top">
                      <span
                        className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                        style={employee.isActive
                          ? { background: 'var(--brand-soft)', color: 'var(--brand-text)' }
                          : { background: 'rgba(148,163,184,0.16)', color: 'var(--text-muted)' }}
                      >
                        {employee.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                      {!employee.isActive && employee.inactiveReason ? (
                        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{employee.inactiveReason}</p>
                      ) : null}
                    </td>
                    {canManage && (
                      <td className="px-6 py-5 align-top">
                        <div className="flex flex-col items-stretch gap-2 xl:flex-row xl:justify-end">
                          <button type="button" onClick={() => openEdit(employee)}
                            className="rounded-lg px-3 py-2 text-xs font-medium transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            Editar
                          </button>
                          <button type="button" onClick={() => handleExportToDevice(employee)} disabled={isPending || devices.length === 0 || !employee.isActive}
                            className="rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}>
                            Enviar al reloj
                          </button>
                          <button type="button" onClick={() => handleToggleActive(employee, !employee.isActive)} disabled={isPending}
                            className="rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60"
                            style={employee.isActive
                              ? { background: 'var(--danger-soft)', color: 'var(--danger-text)' }
                              : { background: 'rgba(31,199,119,0.12)', color: 'var(--brand-text)' }}
                          >
                            {employee.isActive ? 'Inactivar' : 'Reactivar'}
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
                          {row.deviceUser ? (row.deviceUser.name || 'Sin nombre informado') : '—'}
                        </td>
                        <td className="break-words px-4 py-4" style={{ color: 'var(--text-secondary)' }}>
                          {row.systemEmployeeName || formatEmployeeName(row.employee) || '—'}
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
                {!form.scheduleProfileId ? (
                  <div className="mt-2 rounded-lg border px-3 py-2 text-xs" style={{ background: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.35)', color: '#92400e' }}>
                    ⚠️ Sin perfil horario asignado. El sistema no calculará tardanzas, ausencias, horas esperadas ni cierre mensual para este empleado.
                  </div>
                ) : (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    El perfil determina el horario de trabajo y los días laborales. Recalculá el período si lo cambiás.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Sector / Departamento</label>
                  <select
                    name="departmentId"
                    value={form.departmentId}
                    onChange={handleChange}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Sin sector asignado</option>
                    {departments.filter((department) => department.isActive).map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  {departments.length === 0 ? (
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>No hay departamentos cargados.</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Puesto / Cargo</label>
                  <select
                    name="positionId"
                    value={form.positionId}
                    onChange={handleChange}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Sin puesto asignado</option>
                    {positions.filter((position) => position.isActive).map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                  {positions.length === 0 ? (
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>No hay puestos cargados.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                <label className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                  />
                  Empleado activo
                </label>
                {!form.isActive ? (
                  <>
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Al inactivar un empleado, dejará de aparecer en reportes operativos por defecto, pero se conservará su historial.
                    </p>
                    <label className="mt-3 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Motivo de baja
                      <textarea
                        name="inactiveReason"
                        value={form.inactiveReason}
                        onChange={handleChange}
                        rows={3}
                        className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                      />
                    </label>
                  </>
                ) : null}
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

      {canManage && isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Importar empleados</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                El archivo no se importa hasta que confirmes. Los sectores, puestos y perfiles deben existir previamente.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              {importMessage && (
                <div
                  className="rounded-lg border px-4 py-3 text-sm"
                  style={
                    importMessage.type === 'success'
                      ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
                      : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
                  }
                >
                  {importMessage.text}
                </div>
              )}

              <form onSubmit={handleImportPreview} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Archivo CSV o Excel</label>
                    <input
                      type="file"
                      name="file"
                      accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      required
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                    />
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Los empleados duplicados no se importarán. Columnas: documento, nombre, apellido, sector, puesto, perfil_horario, activo.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/api/employees/import/template"
                      className="rounded-lg px-4 py-2 text-sm transition-colors"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                      Descargar plantilla CSV
                    </a>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                    >
                      Previsualizar
                    </button>
                  </div>
                </div>
              </form>

              {importPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <SummaryTile label="Filas leídas" value={importPreview.totalRows} helper="Incluye válidas y con errores" />
                    <SummaryTile label="Filas válidas" value={importPreview.validRows} helper="Listas para confirmar" />
                    <SummaryTile label="Filas con errores" value={importPreview.invalidRows} helper="No se importarán" tone={importPreview.invalidRows > 0 ? 'warning' : 'default'} />
                  </div>

                  {importPreview.warnings.length > 0 && (
                    <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.35)', color: '#92400e' }}>
                      <p className="font-semibold">Advertencias</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {importPreview.warnings.slice(0, 8).map((warning) => <li key={warning}>{warning}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Filas válidas</h4>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      <table className="w-full min-w-[820px] text-sm">
                        <thead>
                          <tr className="table-header-row text-xs uppercase">
                            <th className="px-4 py-3 text-left">Fila</th>
                            <th className="px-4 py-3 text-left">Documento</th>
                            <th className="px-4 py-3 text-left">Empleado</th>
                            <th className="px-4 py-3 text-left">Sector</th>
                            <th className="px-4 py-3 text-left">Puesto</th>
                            <th className="px-4 py-3 text-left">Perfil</th>
                            <th className="px-4 py-3 text-left">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.normalizedRows.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                No se encontraron filas válidas.
                              </td>
                            </tr>
                          ) : importPreview.normalizedRows.slice(0, 50).map((row) => (
                            <tr key={`${row.rowNumber}-${row.documento}`} className="table-row">
                              <td className="px-4 py-3">{row.rowNumber}</td>
                              <td className="px-4 py-3">{row.documento}</td>
                              <td className="px-4 py-3">{row.apellido}, {row.nombre}</td>
                              <td className="px-4 py-3">{row.departmentName || 'Sin sector'}</td>
                              <td className="px-4 py-3">{row.positionName || 'Sin puesto'}</td>
                              <td className="px-4 py-3">{row.scheduleProfileName || 'Sin perfil'}</td>
                              <td className="px-4 py-3">{row.isActive ? 'Activo' : 'Inactivo'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="rounded-xl border" style={{ borderColor: 'rgba(230,45,66,0.35)' }}>
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(230,45,66,0.35)' }}>
                        <h4 className="font-semibold" style={{ color: 'var(--danger-text)' }}>Filas con errores</h4>
                      </div>
                      <div className="max-h-60 overflow-auto">
                        <table className="w-full min-w-[720px] text-sm">
                          <thead>
                            <tr className="table-header-row text-xs uppercase">
                              <th className="px-4 py-3 text-left">Fila</th>
                              <th className="px-4 py-3 text-left">Documento</th>
                              <th className="px-4 py-3 text-left">Empleado</th>
                              <th className="px-4 py-3 text-left">Errores</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.errors.map((row) => (
                              <tr key={`error-${row.rowNumber}`} className="table-row">
                                <td className="px-4 py-3">{row.rowNumber}</td>
                                <td className="px-4 py-3">{row.documento || '—'}</td>
                                <td className="px-4 py-3">{[row.apellido, row.nombre].filter(Boolean).join(', ') || '—'}</td>
                                <td className="px-4 py-3">{row.errors.join(' ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeImport} disabled={isPending}
                  className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleImportConfirm}
                  disabled={isPending || !importPreview || importPreview.validRows === 0 || importPreview.invalidRows > 0}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 transition-colors"
                >
                  Confirmar importación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
