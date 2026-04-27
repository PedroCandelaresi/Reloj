'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { CompanyRole } from '@/lib/auth-token';
import type { CompanyUser, Employee } from '@/lib/api';
import {
  createCompanyUserAction,
  deleteCompanyUserAction,
  updateCompanyUserAction,
} from '@/app/(protected)/users/actions';
import type { CompanyUserActionResult } from '@/app/(protected)/users/actions';

type FormMode = 'create' | 'edit';
type BannerState =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

interface FormValues {
  employeeId: string;
  userId: number | null;
  username: string;
  password: string;
  role: CompanyRole;
}

const EMPTY_FORM: FormValues = {
  employeeId: '',
  userId: null,
  username: '',
  password: '',
  role: 'operator',
};

const ROLE_LABELS: Record<CompanyRole, string> = {
  company_admin: 'Admin empresa',
  operator: 'Operador',
  read_only: 'Solo lectura',
};

function employeeLabel(employee?: CompanyUser['employee'] | Employee | null) {
  if (!employee) return 'Sin empleado';
  const fullName = [employee.apellido, employee.nombre].filter(Boolean).join(', ');
  return fullName ? `${fullName} (${employee.id})` : employee.id;
}

function toEditForm(companyUser: CompanyUser): FormValues {
  return {
    employeeId: companyUser.user?.employeeId ?? companyUser.employee?.id ?? '',
    userId: companyUser.user?.id ?? null,
    username: companyUser.user?.username ?? '',
    password: '',
    role: companyUser.role,
  };
}

export function CompanyUsersManager({
  users,
  eligibleEmployees,
}: {
  users: CompanyUser[];
  eligibleEmployees: Employee[];
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

  const openEdit = (companyUser: CompanyUser) => {
    setMode('edit');
    setForm(toEditForm(companyUser));
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
    setForm((current) => {
      if (name === 'role') {
        return { ...current, role: value as CompanyRole };
      }

      if (name === 'employeeId') {
        return { ...current, employeeId: value };
      }

      if (name === 'username') {
        return { ...current, username: value };
      }

      if (name === 'password') {
        return { ...current, password: value };
      }

      return current;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setBanner(null);

    const employeeId = form.employeeId.trim();
    const username = form.username.trim();
    const password = form.password.trim();

    if (mode === 'create' && (!employeeId || !username || !password)) {
      setFormError('Seleccioná empleado, usuario y contraseña.');
      return;
    }

    if (mode === 'edit' && !form.userId) {
      setFormError('Usuario inválido.');
      return;
    }

    startTransition(() => {
      const request =
        mode === 'create'
          ? createCompanyUserAction({
              employeeId,
              username,
              password,
              role: form.role,
            })
          : updateCompanyUserAction(form.userId ?? 0, {
              username,
              password,
              role: form.role,
            });

      void request
        .then((result: CompanyUserActionResult) => {
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
                ? 'Usuario creado correctamente.'
                : 'Usuario actualizado correctamente.',
          });
          router.refresh();
        })
        .catch(() => {
          setFormError('No se pudo guardar el usuario.');
        });
    });
  };

  const handleDelete = (companyUser: CompanyUser) => {
    const userId = companyUser.user?.id;
    setBanner(null);

    if (!userId) {
      setBanner({ type: 'error', text: 'Usuario inválido.' });
      return;
    }

    if (!window.confirm(`¿Remover acceso de ${companyUser.user?.username ?? 'este usuario'}?`)) {
      return;
    }

    startTransition(() => {
      void deleteCompanyUserAction(userId)
        .then((result) => {
          if (result.error) {
            setBanner({ type: 'error', text: result.error });
            return;
          }

          setBanner({ type: 'success', text: 'Acceso removido correctamente.' });
          router.refresh();
        })
        .catch(() => {
          setBanner({ type: 'error', text: 'No se pudo remover el acceso.' });
        });
    });
  };

  return (
    <>
      <section className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Usuarios de empresa</h2>
            <p className="text-sm text-gray-500 mt-1">{users.length} usuarios con acceso</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Nuevo usuario
          </button>
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
              <tr className="bg-slate-100 text-xs uppercase text-slate-600">
                <th className="px-6 py-4 text-left font-semibold">Empleado</th>
                <th className="px-6 py-4 text-left font-semibold">Usuario</th>
                <th className="px-6 py-4 text-left font-semibold">Rol</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No hay usuarios de empresa todavía.
                  </td>
                </tr>
              ) : (
                users.map((companyUser) => (
                  <tr key={companyUser.id} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {employeeLabel(companyUser.employee)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {companyUser.user?.username ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {ROLE_LABELS[companyUser.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {companyUser.employee?.email || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(companyUser)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(companyUser)}
                          disabled={isPending}
                          className="text-red-500 hover:text-red-600 font-medium disabled:opacity-60"
                        >
                          Remover
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {mode === 'create' ? 'Crear usuario' : 'Editar usuario'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
                <select
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleChange}
                  disabled={mode === 'edit'}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar empleado</option>
                  {mode === 'edit' && form.employeeId && (
                    <option value={form.employeeId}>
                      {employeeLabel(users.find((u) => u.user?.id === form.userId)?.employee)}
                    </option>
                  )}
                  {eligibleEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employeeLabel(employee)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required={mode === 'create'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {mode === 'create' ? 'Contraseña' : 'Nueva contraseña'}
                </label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required={mode === 'create'}
                  placeholder={mode === 'edit' ? 'Dejar vacío para conservar' : undefined}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  ))}
                </select>
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
                  {isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
