'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CompanySummary, CompanyUser, Employee } from '@/lib/api';
import type { CompanyActionResult } from '@/app/(protected)/admin/companies/actions';
import {
  assignCompanyEmployeeAction,
  removeCompanyEmployeeAction,
  createCompanyUserAction,
  updateCompanyUserAction,
  removeCompanyUserAction,
} from '@/app/(protected)/admin/companies/actions';

type Tab = 'employees' | 'users';

type UserForm = {
  employeeId: string;
  username: string;
  password: string;
  role: 'company_admin' | 'operator' | 'read_only';
};

const EMPTY_USER_FORM: UserForm = {
  employeeId: '',
  username: '',
  password: '',
  role: 'company_admin',
};

const ROLE_LABELS: Record<string, string> = {
  company_admin: 'Admin empresa',
  operator: 'Operador',
  read_only: 'Solo lectura',
};

function employeeLabel(employee?: CompanyUser['employee'] | Employee | null) {
  if (!employee) return 'Sin empleado seleccionado';
  return `${employee.apellido}, ${employee.nombre} · N° de usuario/DNI ${employee.id}`;
}

function userEmployeeLinkStatus(user: CompanyUser) {
  const userEmployeeId = user.user?.employeeId ?? null;
  const employeeId = user.employee?.id ?? null;
  if (userEmployeeId && employeeId && userEmployeeId === employeeId) {
    return {
      label: 'Vínculo establecido',
      detail: `El usuario ingresa asociado al DNI/N° ${employeeId}.`,
      tone: 'success' as const,
    };
  }
  if (employeeId && !userEmployeeId) {
    return {
      label: 'Empleado asignado',
      detail: `Figura ${employeeId}, pero falta confirmar el vínculo del usuario.`,
      tone: 'warning' as const,
    };
  }
  if (userEmployeeId && !employeeId) {
    return {
      label: 'Revisar vínculo',
      detail: `El usuario apunta al DNI/N° ${userEmployeeId}, pero no se encontró el empleado.`,
      tone: 'warning' as const,
    };
  }
  return {
    label: 'Sin empleado vinculado',
    detail: 'Este acceso no está asociado a un DNI/N° de empleado.',
    tone: 'danger' as const,
  };
}

function LinkStatusBadge({ status }: { status: ReturnType<typeof userEmployeeLinkStatus> }) {
  const style =
    status.tone === 'success'
      ? { background: 'var(--brand-soft)', color: 'var(--brand-text)' }
      : status.tone === 'warning'
        ? { background: 'rgba(245,158,11,0.14)', color: '#b45309' }
        : { background: 'var(--danger-soft)', color: 'var(--danger-text)' };
  return (
    <div>
      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" style={style}>
        {status.label}
      </span>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {status.detail}
      </p>
    </div>
  );
}

function AdminCompanyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-xs font-medium transition-colors"
      style={{ background: 'var(--blue-soft)', color: 'var(--blue-text)' }}
    >
      {children}
    </Link>
  );
}

export function AdminCompanyDetailPanel({
  company,
  employees,
  eligibleEmployees,
  users,
}: {
  company: CompanySummary;
  employees: Employee[];
  eligibleEmployees: Employee[];
  users: CompanyUser[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>('employees');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedEligible, setSelectedEligible] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(EMPTY_USER_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const handle = (fn: () => Promise<CompanyActionResult>) => {
    setBanner(null);
    setFormError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setBanner({ type: 'error', text: result.error });
      } else {
        setBanner({ type: 'success', text: 'Guardado correctamente.' });
        router.refresh();
      }
    });
  };

  const handleAssignEmployee = () => {
    if (!selectedEligible) return;
    handle(() => assignCompanyEmployeeAction(company.id, selectedEligible));
    setSelectedEligible('');
  };

  const handleRemoveEmployee = (employeeId: string) => {
    if (!confirm('¿Quitar este empleado de la empresa?')) return;
    handle(() => removeCompanyEmployeeAction(company.id, employeeId));
  };

  const openCreateUser = () => {
    setEditingUserId(null);
    setUserForm(EMPTY_USER_FORM);
    setFormError(null);
    setShowUserForm(true);
  };

  const openEditUser = (user: CompanyUser) => {
    setEditingUserId(user.user?.id ?? null);
    setUserForm({
      employeeId: user.employee?.id ?? '',
      username: user.user?.username ?? '',
      password: '',
      role: user.role as UserForm['role'],
    });
    setFormError(null);
    setShowUserForm(true);
  };

  const handleUserSubmit = () => {
    if (!userForm.role) {
      setFormError('Seleccioná un rol.');
      return;
    }
    if (!editingUserId && (!userForm.employeeId || !userForm.username || !userForm.password)) {
      setFormError('Completá empleado, usuario y contraseña para crear el acceso.');
      return;
    }

    if (editingUserId) {
      handle(() =>
        updateCompanyUserAction(company.id, editingUserId, {
          username: userForm.username || undefined,
          password: userForm.password || undefined,
          role: userForm.role,
        }),
      );
    } else {
      handle(() =>
        createCompanyUserAction(company.id, {
          employeeId: userForm.employeeId,
          username: userForm.username,
          password: userForm.password,
          role: userForm.role,
        }),
      );
    }
    setShowUserForm(false);
    setUserForm(EMPTY_USER_FORM);
  };

  const handleRemoveUser = (userId: number) => {
    if (!confirm('¿Eliminar el acceso de este usuario?')) return;
    handle(() => removeCompanyUserAction(company.id, userId));
  };

  return (
    <div className="card rounded-xl mt-6">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {company.nombreFantasia || company.razonSocial}
            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>{company.cuit}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <AdminCompanyLink href={`/reports?companyId=${company.id}`}>Reportes</AdminCompanyLink>
            <AdminCompanyLink href={`/attendance/requests?companyId=${company.id}`}>Solicitudes</AdminCompanyLink>
            <AdminCompanyLink href={`/settings/holidays?companyId=${company.id}`}>Feriados</AdminCompanyLink>
          </div>
        </div>
      </div>

      {banner && (
        <div className="mx-6 mt-4 rounded-lg border px-4 py-3 text-sm" style={
          banner.type === 'success'
            ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
            : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
        }>
          {banner.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-6 mt-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['employees', 'users'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            style={tab === t
              ? { borderColor: 'var(--brand)', color: 'var(--brand-text)' }
              : { borderColor: 'transparent', color: 'var(--text-muted)' }
            }
          >
            {t === 'employees' ? `Empleados (${employees.length})` : `Usuarios (${users.length})`}
          </button>
        ))}
      </div>

      {/* Empleados */}
      {tab === 'employees' && (
        <div className="px-6 py-5 space-y-4">
          {eligibleEmployees.length > 0 && (
            <div className="flex gap-3">
              <select
                value={selectedEligible}
                onChange={(e) => setSelectedEligible(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              >
                <option value="">Asignar empleado existente...</option>
                {eligibleEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.apellido}, {emp.nombre} — {emp.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedEligible || isPending}
                onClick={handleAssignEmployee}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Asignar
              </button>
            </div>
          )}

          {employees.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No hay empleados asignados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th className="py-2 text-left">DNI</th>
                  <th className="py-2 text-left">Nombre</th>
                  <th className="py-2 text-left">Email</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2.5" style={{ color: 'var(--text-muted)' }}>{emp.id}</td>
                    <td className="py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{emp.apellido}, {emp.nombre}</td>
                    <td className="py-2.5" style={{ color: 'var(--text-muted)' }}>{emp.email || '—'}</td>
                    <td className="py-2.5 text-right">
                      <button type="button" disabled={isPending} onClick={() => handleRemoveEmployee(emp.id)}
                        className="text-xs font-medium transition-colors" style={{ color: 'var(--danger-text)' }}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Usuarios */}
      {tab === 'users' && (
        <div className="px-6 py-5 space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openCreateUser}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Nuevo usuario
            </button>
          </div>

          {showUserForm && (
            <div className="rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--brand-text)' }}>
                {editingUserId ? 'Editar acceso' : 'Crear acceso'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                El acceso queda vinculado al empleado seleccionado. Ese vínculo permite relacionar usuario, DNI/N° de usuario y permisos dentro de la empresa.
              </p>
              {formError && (
                <p className="text-sm" style={{ color: 'var(--danger-text)' }}>{formError}</p>
              )}
              {!editingUserId && (
                <select
                  value={userForm.employeeId}
                  onChange={(e) => setUserForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar empleado...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {employeeLabel(emp)}
                    </option>
                  ))}
                </select>
              )}
              {userForm.employeeId && (
                <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  Se va a vincular con: {employeeLabel(employees.find((employee) => employee.id === userForm.employeeId))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Usuario"
                  value={userForm.username}
                  onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
                  className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                />
                <input
                  placeholder={editingUserId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                />
              </div>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value as UserForm['role'] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="company_admin">Admin empresa</option>
                <option value="operator">Operador</option>
                <option value="read_only">Solo lectura</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowUserForm(false); setFormError(null); }}
                  className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleUserSubmit}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {users.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No hay usuarios con acceso.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th className="py-2 text-left">Usuario</th>
                  <th className="py-2 text-left">Empleado</th>
                  <th className="py-2 text-left">Vínculo DNI/usuario</th>
                  <th className="py-2 text-left">Rol</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{u.user?.username ?? '—'}</td>
                    <td className="py-2.5" style={{ color: 'var(--text-muted)' }}>
                      {u.employee ? (
                        <div>
                          <p style={{ color: 'var(--text-secondary)' }}>{u.employee.apellido}, {u.employee.nombre}</p>
                          <p className="text-xs">DNI/N°: {u.employee.id}</p>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-2.5">
                      <LinkStatusBadge status={userEmployeeLinkStatus(u)} />
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'var(--blue-soft)', color: 'var(--blue-text)' }}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="py-2.5 text-right flex justify-end gap-3">
                      <button type="button" disabled={isPending} onClick={() => openEditUser(u)}
                        className="text-xs font-medium transition-colors" style={{ color: 'var(--blue-text)' }}>
                        Editar
                      </button>
                      {u.user && (
                        <button type="button" disabled={isPending} onClick={() => handleRemoveUser(u.user!.id)}
                          className="text-xs font-medium transition-colors" style={{ color: 'var(--danger-text)' }}>
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
