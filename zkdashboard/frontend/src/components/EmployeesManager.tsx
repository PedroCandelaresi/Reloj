'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Employee, ScheduleProfile } from '@/lib/api';
import type { ActionResult } from '@/app/(protected)/employees/actions';
import {
  createEmployeeAction,
  deleteEmployeeAction,
  updateEmployeeAction,
} from '@/app/(protected)/employees/actions';

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
  return <EmployeesManagerContent employees={employees} scheduleProfiles={[]} canManage />;
}

export function EmployeesManagerContent({
  employees,
  scheduleProfiles,
  canManage,
}: {
  employees: Employee[];
  scheduleProfiles: ScheduleProfile[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<FormMode>('create');
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerState>(null);

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

    startTransition(() => {
      const request =
        mode === 'create'
            ? createEmployeeAction({
              id,
              nombre,
              apellido,
              telefono: telefono || null,
              email: email || null,
              entryTime: entryTime || null,
              exitTime: exitTime || null,
              scheduleProfileId: scheduleProfileId || null,
            })
          : updateEmployeeAction(id, {
              nombre,
              apellido,
              telefono: telefono || null,
              email: email || null,
              entryTime: entryTime || null,
              exitTime: exitTime || null,
              scheduleProfileId: scheduleProfileId || null,
            });

      void request
        .then((result: ActionResult) => {
          if (result.error) {
            setFormError(result.error);
            return;
          }

          setIsModalOpen(false);
          setForm(EMPTY_FORM);
          setFormError(null);
          setBanner({
            type: 'success',
            text:
              mode === 'create'
                ? 'Empleado creado correctamente.'
                : 'Empleado actualizado correctamente.',
          });
          router.refresh();
        })
        .catch(() => {
          setFormError('No se pudo guardar el empleado.');
        });
    });
  };

  const handleDelete = (employee: Employee) => {
    setBanner(null);

    if (!window.confirm(`¿Eliminar a ${employee.apellido}, ${employee.nombre}?`)) {
      return;
    }

    startTransition(() => {
      void deleteEmployeeAction(employee.id)
        .then((result: ActionResult) => {
          if (result.error) {
            setBanner({ type: 'error', text: result.error });
            return;
          }

          if (isModalOpen && form.id === employee.id) {
            setIsModalOpen(false);
            setForm(EMPTY_FORM);
            setFormError(null);
          }

          setBanner({ type: 'success', text: 'Empleado eliminado correctamente.' });
          router.refresh();
        })
        .catch(() => {
          setBanner({ type: 'error', text: 'No se pudo eliminar el empleado.' });
        });
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Maestra de empleados</h2>
            <p className="text-sm text-gray-500 mt-1">{employees.length} empleados registrados</p>
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
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              Vista de solo lectura
            </span>
          )}
        </div>

        {banner && (
          <div
            className={`mx-6 mt-6 rounded-lg border px-4 py-3 text-sm ${
              banner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {banner.text}
          </div>
        )}

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
                <th className="px-6 py-4 text-left font-semibold">DNI</th>
                <th className="px-6 py-4 text-left font-semibold">Apellido</th>
                <th className="px-6 py-4 text-left font-semibold">Nombre</th>
                <th className="px-6 py-4 text-left font-semibold">Teléfono</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-left font-semibold">Entrada</th>
                <th className="px-6 py-4 text-left font-semibold">Salida</th>
                <th className="px-6 py-4 text-left font-semibold">Perfil</th>
                {canManage && (
                  <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 9 : 8}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No hay empleados registrados todavía.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{employee.id}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.apellido}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.nombre}</td>
                    <td className="px-6 py-4 text-gray-500">{employee.telefono || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{employee.email || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{employee.entryTime || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{employee.exitTime || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {employee.scheduleProfile?.name || '—'}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(employee)}
                            className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(employee)}
                            disabled={isPending}
                            className="text-red-500 hover:text-red-600 font-medium transition-colors disabled:opacity-60"
                          >
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

      {canManage && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {mode === 'create' ? 'Agregar empleado' : 'Editar empleado'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                El DNI debe coincidir con el `user_id` que llega desde el reloj.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                <input
                  name="id"
                  value={form.id}
                  onChange={handleChange}
                  required
                  disabled={mode === 'edit'}
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    name="apellido"
                    value={form.apellido}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil horario
                </label>
                <select
                  name="scheduleProfileId"
                  value={form.scheduleProfileId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin perfil asignado</option>
                  {scheduleProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.entryTime} - {profile.exitTime})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Los horarios propios de abajo pisan al perfil. Dejalos vacíos para usar verano/invierno del perfil.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horario de entrada
                  </label>
                  <input
                    name="entryTime"
                    type="time"
                    value={form.entryTime}
                    onChange={handleChange}
                    step={60}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horario de salida
                  </label>
                  <input
                    name="exitTime"
                    type="time"
                    value={form.exitTime}
                    onChange={handleChange}
                    step={60}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
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
