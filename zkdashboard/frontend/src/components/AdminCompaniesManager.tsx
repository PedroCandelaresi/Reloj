'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { CompanySummary } from '@/lib/api';
import type { CompanyActionResult } from '@/app/(protected)/admin/companies/actions';
import {
  createCompanyAction,
  deleteCompanyAction,
  updateCompanyAction,
} from '@/app/(protected)/admin/companies/actions';
import { maskTimeInput } from '@/lib/input-masks';

type FormMode = 'create' | 'edit';

type FormValues = {
  cuit: string;
  razonSocial: string;
  nombreFantasia: string;
  isActive: boolean;
  defaultEntryTime: string;
  defaultExitTime: string;
  email: string;
  phone: string;
};

type BannerState =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

const EMPTY_FORM: FormValues = {
  cuit: '',
  razonSocial: '',
  nombreFantasia: '',
  isActive: true,
  defaultEntryTime: '',
  defaultExitTime: '',
  email: '',
  phone: '',
};

function toFormValues(company: CompanySummary): FormValues {
  return {
    cuit: company.cuit,
    razonSocial: company.razonSocial,
    nombreFantasia: company.nombreFantasia ?? '',
    isActive: company.isActive,
    defaultEntryTime: company.defaultEntryTime ?? '',
    defaultExitTime: company.defaultExitTime ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
  };
}

const TZ = 'America/Argentina/Buenos_Aires';

function formatDate(iso?: string) {
  if (!iso) return '—';
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

export function AdminCompaniesManager({
  companies,
  selectedCompanyId: activeCompanyId,
}: {
  companies: CompanySummary[];
  selectedCompanyId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<FormMode>('create');
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerState>(null);

  const openCreate = () => {
    setMode('create');
    setEditingCompanyId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (company: CompanySummary) => {
    setMode('edit');
    setEditingCompanyId(company.id);
    setForm(toFormValues(company));
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isPending) return;
    setIsModalOpen(false);
    setEditingCompanyId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = event.target;
    const nextValue =
      type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : name === 'defaultEntryTime' || name === 'defaultExitTime'
          ? maskTimeInput(value)
          : value;

    setForm((current) => ({
      ...current,
      [name]: nextValue,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setBanner(null);

    const payload = {
      cuit: form.cuit.trim(),
      razonSocial: form.razonSocial.trim(),
      nombreFantasia: form.nombreFantasia.trim() || null,
      isActive: form.isActive,
      defaultEntryTime: form.defaultEntryTime.trim() || null,
      defaultExitTime: form.defaultExitTime.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    };

    if (!payload.cuit || !payload.razonSocial) {
      setFormError('Completá CUIT y razón social.');
      return;
    }

    startTransition(() => {
      const request =
        mode === 'create'
          ? createCompanyAction(payload)
          : updateCompanyAction(editingCompanyId ?? '', payload);

      void request
        .then((result: CompanyActionResult) => {
          if (result.error) {
            setFormError(result.error);
            return;
          }

          setIsModalOpen(false);
          setEditingCompanyId(null);
          setForm(EMPTY_FORM);
          setFormError(null);
          setBanner({
            type: 'success',
            text:
              mode === 'create'
                ? 'Empresa creada correctamente.'
                : 'Empresa actualizada correctamente.',
          });
          router.refresh();
        })
        .catch(() => {
          setFormError('No se pudo guardar la empresa.');
        });
    });
  };

  const handleDelete = (company: CompanySummary) => {
    setBanner(null);

    if (!window.confirm(`¿Eliminar a ${company.razonSocial}?`)) {
      return;
    }

    startTransition(() => {
      void deleteCompanyAction(company.id)
        .then((result: CompanyActionResult) => {
          if (result.error) {
            setBanner({ type: 'error', text: result.error });
            return;
          }

          if (editingCompanyId === company.id) {
            closeModal();
          }

          setBanner({ type: 'success', text: 'Empresa eliminada correctamente.' });
          router.refresh();
        })
        .catch(() => {
          setBanner({ type: 'error', text: 'No se pudo eliminar la empresa.' });
        });
    });
  };

  return (
    <>
      <section className="card rounded-xl">
        <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Empresas registradas</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{companies.length} empresas cargadas</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Nueva empresa
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
                <th className="px-6 py-4 text-left font-semibold">CUIT</th>
                <th className="px-6 py-4 text-left font-semibold">Razón social</th>
                <th className="px-6 py-4 text-left font-semibold">Nombre fantasía</th>
                <th className="px-6 py-4 text-left font-semibold">Estado</th>
                <th className="px-6 py-4 text-left font-semibold">Actualizada</th>
                <th className="px-6 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                    No hay empresas registradas todavía.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="transition-colors border-t" style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{company.cuit}</td>
                    <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{company.razonSocial}</td>
                    <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>{company.nombreFantasia || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        company.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400'
                      }`}>
                        {company.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--text-muted)' }}>{formatDate(company.updatedAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-3">
                        <a href={`/admin/companies?company=${company.id}`}
                          className="font-medium transition-colors"
                          style={{ color: activeCompanyId === company.id ? 'var(--blue-text)' : 'var(--blue-text)', textDecoration: activeCompanyId === company.id ? 'underline' : 'none' }}
                        >
                          {activeCompanyId === company.id ? 'Abierta ↓' : 'Detalle'}
                        </a>
                        <button type="button" onClick={() => openEdit(company)} className="font-medium transition-colors" style={{ color: 'var(--brand-text)' }}>Editar</button>
                        <button type="button" onClick={() => handleDelete(company)} disabled={isPending} className="font-medium transition-colors disabled:opacity-60" style={{ color: 'var(--danger-text)' }}>Eliminar</button>
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
          <div className="w-full max-w-2xl rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {mode === 'create' ? 'Crear empresa' : 'Editar empresa'}
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Configurá los datos básicos para operar la empresa en CONFLUNET.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }}>
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>CUIT</label>
                  <input name="cuit" value={form.cuit} onChange={handleChange} required inputMode="numeric"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                    Empresa activa
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Razón social</label>
                <input name="razonSocial" value={form.razonSocial} onChange={handleChange} required
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nombre fantasía</label>
                <input name="nombreFantasia" value={form.nombreFantasia} onChange={handleChange}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Entrada global <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(HH:MM)</span>
                  </label>
                  <input name="defaultEntryTime" type="text" inputMode="numeric" value={form.defaultEntryTime} onChange={handleChange} placeholder="08:00" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$" maxLength={5}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Salida global <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(HH:MM)</span>
                  </label>
                  <input name="defaultExitTime" type="text" inputMode="numeric" value={form.defaultExitTime} onChange={handleChange} placeholder="17:00" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$" maxLength={5}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email de contacto</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="contacto@empresa.com"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Teléfono</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+54 299 000-0000"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={isPending}
                  className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  {isPending ? 'Guardando...' : mode === 'create' ? 'Crear empresa' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
