'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  saveOrgStructureItemAction,
  toggleOrgStructureItemAction,
  type OrgStructureActionResult,
} from '@/app/(protected)/settings/org-structure/actions';
import type { Department, Position } from '@/lib/api';
import { humanizeActionError } from '@/lib/ux-labels';

type CatalogKind = 'department' | 'position';
type CatalogItem = Department | Position;

type FormValues = {
  id: string;
  kind: CatalogKind;
  name: string;
  description: string;
};

const EMPTY_FORM: FormValues = {
  id: '',
  kind: 'department',
  name: '',
  description: '',
};

function toForm(kind: CatalogKind, item: CatalogItem): FormValues {
  return {
    id: item.id,
    kind,
    name: item.name,
    description: item.description ?? '',
  };
}

function statusBadge(isActive: boolean) {
  return isActive
    ? { label: 'Activo', style: { background: 'var(--brand-soft)', color: 'var(--brand-text)' } }
    : { label: 'Inactivo', style: { background: 'rgba(148,163,184,0.16)', color: 'var(--text-muted)' } };
}

function CatalogSection({
  kind,
  title,
  emptyMessage,
  items,
  canManage,
  onEdit,
  onToggle,
  isPending,
}: {
  kind: CatalogKind;
  title: string;
  emptyMessage: string;
  items: CatalogItem[];
  canManage: boolean;
  onEdit: (kind: CatalogKind, item: CatalogItem) => void;
  onToggle: (kind: CatalogKind, item: CatalogItem, nextIsActive: boolean) => void;
  isPending: boolean;
}) {
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'es')),
    [items],
  );

  return (
    <section className="card rounded-xl">
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="table-header-row text-xs uppercase">
              <th className="w-[32%] px-6 py-4 text-left font-semibold">Nombre</th>
              <th className="w-[36%] px-6 py-4 text-left font-semibold">Descripción</th>
              <th className="w-[14%] px-6 py-4 text-left font-semibold">Estado</th>
              {canManage && <th className="w-[18%] px-6 py-4 text-right font-semibold">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const badge = statusBadge(item.isActive);
                return (
                  <tr key={item.id} className="table-row">
                    <td className="break-words px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                    <td className="break-words px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{item.description || 'Sin descripción'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium" style={badge.style}>
                        {badge.label}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => onEdit(kind, item)}
                            disabled={isPending}
                            className="font-medium disabled:opacity-60"
                            style={{ color: 'var(--brand-text)' }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggle(kind, item, !item.isActive)}
                            disabled={isPending}
                            className="font-medium disabled:opacity-60"
                            style={{ color: item.isActive ? 'var(--danger-text)' : 'var(--brand-text)' }}
                          >
                            {item.isActive ? 'Desactivar' : 'Reactivar'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function OrgStructureManager({
  departments,
  positions,
  canManage,
  companyId,
}: {
  departments: Department[];
  positions: Position[];
  canManage: boolean;
  companyId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEditing = Boolean(form.id);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!canManage) return;
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: form.kind === 'department' ? 'Completá el nombre del sector.' : 'Completá el nombre del puesto.' });
      return;
    }

    startTransition(() => {
      void saveOrgStructureItemAction({
        kind: form.kind,
        id: form.id || undefined,
        name: form.name,
        description: form.description || null,
        companyId: companyId || null,
      })
        .then((result: OrgStructureActionResult) => {
          if (result.error) {
            setMessage({ type: 'error', text: humanizeActionError(result.error) });
            return;
          }
          setMessage({ type: 'success', text: isEditing ? 'Elemento actualizado.' : 'Elemento creado.' });
          setForm({ ...EMPTY_FORM, kind: form.kind });
          router.refresh();
        })
        .catch(() => setMessage({ type: 'error', text: humanizeActionError('Failed to fetch') }));
    });
  };

  const handleEdit = (kind: CatalogKind, item: CatalogItem) => {
    setForm(toForm(kind, item));
    setMessage(null);
  };

  const handleToggle = (kind: CatalogKind, item: CatalogItem, nextIsActive: boolean) => {
    setMessage(null);
    if (!nextIsActive) {
      const confirmed = window.confirm(
        'Al desactivar este elemento, no se podrá asignar a nuevos empleados, pero se conserva el historial. ¿Continuás?',
      );
      if (!confirmed) return;
    }

    startTransition(() => {
      void toggleOrgStructureItemAction({
        kind,
        id: item.id,
        isActive: nextIsActive,
        name: item.name,
        description: item.description,
      })
        .then((result: OrgStructureActionResult) => {
          if (result.error) {
            setMessage({ type: 'error', text: humanizeActionError(result.error) });
            return;
          }
          if (form.id === item.id) resetForm();
          setMessage({ type: 'success', text: nextIsActive ? 'Elemento reactivado.' : 'Elemento desactivado.' });
          router.refresh();
        })
        .catch(() => setMessage({ type: 'error', text: humanizeActionError('Failed to fetch') }));
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-6">
        {message && (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={
              message.type === 'success'
                ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
                : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
            }
          >
            {message.text}
          </div>
        )}

        <CatalogSection
          kind="department"
          title="Sectores / Departamentos"
          emptyMessage="No hay sectores cargados."
          items={departments}
          canManage={canManage}
          onEdit={handleEdit}
          onToggle={handleToggle}
          isPending={isPending}
        />

        <CatalogSection
          kind="position"
          title="Puestos / Cargos"
          emptyMessage="No hay puestos cargados."
          items={positions}
          canManage={canManage}
          onEdit={handleEdit}
          onToggle={handleToggle}
          isPending={isPending}
        />
      </div>

      <aside className="card h-fit rounded-xl">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEditing ? 'Editar elemento' : 'Nuevo elemento'}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Usá estos catálogos para ordenar empleados y filtrar reportes.
          </p>
        </div>

        {canManage ? (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
              <select
                name="kind"
                value={form.kind}
                onChange={handleChange}
                disabled={isEditing}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              >
                <option value="department">Sector / Departamento</option>
                <option value="position">Puesto / Cargo</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={120}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Descripción opcional</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                maxLength={500}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear'}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-5 py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            Podés consultar la estructura, pero solo un administrador de empresa puede crear o modificar sectores y puestos.
          </div>
        )}
      </aside>
    </div>
  );
}
