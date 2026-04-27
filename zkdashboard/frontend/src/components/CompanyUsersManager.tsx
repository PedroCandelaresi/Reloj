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

  const openCreate = () => { setMode('create'); setForm(EMPTY_FORM); setFormError(null); setIsModalOpen(true); };
  const openEdit = (companyUser: CompanyUser) => { setMode('edit'); setForm(toEditForm(companyUser)); setFormError(null); setIsModalOpen(true); };
  const closeModal = () => { if (isPending) return; setIsModalOpen(false); setForm(EMPTY_FORM); setFormError(null); };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => {
      if (name === 'role') return { ...current, role: value as CompanyRole };
      if (name === 'employeeId') return { ...current, employeeId: value };
      if (name === 'username') return { ...current, username: value };
      if (name === 'password') return { ...current, password: value };
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

    if (mode === 'create' && (!employeeId || !username || !password)) { setFormError('Seleccioná empleado, usuario y contraseña.'); return; }
    if (mode === 'edit' && !form.userId) { setFormError('Usuario inválido.'); return; }

    startTransition(() => {
      const request =
        mode === 'create'
          ? createCompanyUserAction({ employeeId, username, password, role: form.role })
          : updateCompanyUserAction(form.userId ?? 0, { username, password, role: form.role });

      void request
        .then((result: CompanyUserActionResult) => {
          if (result.error) { setFormError(result.error); return; }
          setIsModalOpen(false); setForm(EMPTY_FORM); setFormError(null);
          setBanner({ type: 'success', text: mode === 'create' ? 'Usuario creado correctamente.' : 'Usuario actualizado correctamente.' });
          router.refresh();
        })
        .catch(() => { setFormError('No se pudo guardar el usuario.'); });
    });
  };

  const handleDelete = (companyUser: CompanyUser) => {
    const userId = companyUser.user?.id;
    setBanner(null);
    if (!userId) { setBanner({ type: 'error', text: 'Usuario inválido.' }); return; }
    if (!window.confirm(`¿Remover acceso de ${companyUser.user?.username ?? 'este usuario'}?`)) return;

    startTransition(() => {
      void deleteCompanyUserAction(userId)
        .then((result) => {
          if (result.error) { setBanner({ type: 'error', text: result.error }); return; }
          setBanner({ type: 'success', text: 'Acceso removido correctamente.' });
          router.refresh();
        })
        .catch(() => { setBanner({ type: 'error', text: 'No se pudo remover el acceso.' }); });
    });
  };

  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' };

  return (
    <>
      <section className="card rounded-xl">
        <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Usuarios de empresa</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{users.length} usuarios con acceso</p>
          </div>
          <button type="button" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Nuevo usuario
          </button>
        </div>

        {banner && (
          <div className="mx-6 mt-6 rounded-lg border px-4 py-3 text-sm" style={
            banner.type === 'success'
              ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
              : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
          }>
            {banner.text}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-row text-xs uppercase">
                <th className="px-6 py-4 text-left font-semibold">Empleado</th>
                <th className="px-6 py-4 text-left font-semibold">Usuario</th>
                <th className="px-6 py-4 text-left font-semibold">Rol</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                    No hay usuarios de empresa todavía.
                  </td>
                </tr>
              ) : (
                users.map((companyUser) => (
                  <tr key={companyUser.id} className="transition-colors border-t" style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{employeeLabel(companyUser.employee)}</td>
                    <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{companyUser.user?.username ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}>
                        {ROLE_LABELS[companyUser.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>{companyUser.employee?.email || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => openEdit(companyUser)} className="font-medium transition-colors" style={{ color: 'var(--brand-text)' }}>Editar</button>
                        <button type="button" onClick={() => handleDelete(companyUser)} disabled={isPending} className="font-medium transition-colors disabled:opacity-60" style={{ color: 'var(--danger-text)' }}>Remover</button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-xl rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {mode === 'create' ? 'Crear usuario' : 'Editar usuario'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }}>
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Empleado</label>
                <select name="employeeId" value={form.employeeId} onChange={handleChange} disabled={mode === 'edit'} required
                  className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={inputStyle}>
                  <option value="">Seleccionar empleado</option>
                  {mode === 'edit' && form.employeeId && (
                    <option value={form.employeeId}>{employeeLabel(users.find((u) => u.user?.id === form.userId)?.employee)}</option>
                  )}
                  {eligibleEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Usuario</label>
                <input name="username" value={form.username} onChange={handleChange} required={mode === 'create'}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={inputStyle} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {mode === 'create' ? 'Contraseña' : 'Nueva contraseña'}
                </label>
                <input name="password" type="password" value={form.password} onChange={handleChange}
                  required={mode === 'create'} placeholder={mode === 'edit' ? 'Dejar vacío para conservar' : undefined}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={inputStyle} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Rol</label>
                <select name="role" value={form.role} onChange={handleChange}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={inputStyle}>
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={isPending}
                  className="px-4 py-2 rounded-lg text-sm disabled:opacity-60 transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 transition-colors">
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
