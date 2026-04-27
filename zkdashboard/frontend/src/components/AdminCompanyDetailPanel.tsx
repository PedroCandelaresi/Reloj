'use client';

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
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 mt-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">
          {company.nombreFantasia || company.razonSocial}
          <span className="ml-2 text-sm font-normal text-gray-400">{company.cuit}</span>
        </h3>
      </div>

      {banner && (
        <div
          className={`mx-6 mt-4 rounded-lg border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-6 mt-4">
        {(['employees', 'users'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
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
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <p className="text-sm text-gray-500 py-4 text-center">No hay empleados asignados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
                  <th className="py-2 text-left">DNI</th>
                  <th className="py-2 text-left">Nombre</th>
                  <th className="py-2 text-left">Email</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td className="py-2.5 text-gray-500">{emp.id}</td>
                    <td className="py-2.5 font-medium text-gray-900">
                      {emp.apellido}, {emp.nombre}
                    </td>
                    <td className="py-2.5 text-gray-500">{emp.email || '—'}</td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemoveEmployee(emp.id)}
                        className="text-red-500 hover:text-red-600 text-xs font-medium"
                      >
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
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800">
                {editingUserId ? 'Editar acceso' : 'Crear acceso'}
              </p>
              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
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
                      {emp.apellido}, {emp.nombre} — {emp.id}
                    </option>
                  ))}
                </select>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Usuario"
                  value={userForm.username}
                  onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  placeholder={editingUserId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
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
            <p className="text-sm text-gray-500 py-4 text-center">No hay usuarios con acceso.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
                  <th className="py-2 text-left">Usuario</th>
                  <th className="py-2 text-left">Empleado</th>
                  <th className="py-2 text-left">Rol</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 font-medium text-gray-900">
                      {u.user?.username ?? '—'}
                    </td>
                    <td className="py-2.5 text-gray-500">
                      {u.employee
                        ? `${u.employee.apellido}, ${u.employee.nombre}`
                        : '—'}
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="py-2.5 text-right flex justify-end gap-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => openEditUser(u)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        Editar
                      </button>
                      {u.user && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRemoveUser(u.user!.id)}
                          className="text-red-500 hover:text-red-600 text-xs font-medium"
                        >
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
