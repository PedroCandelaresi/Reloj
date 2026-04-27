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

type FormMode = 'create' | 'edit';

type FormValues = {
  cuit: string;
  razonSocial: string;
  nombreFantasia: string;
  isActive: boolean;
  defaultEntryTime: string;
  defaultExitTime: string;
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
};

function toFormValues(company: CompanySummary): FormValues {
  return {
    cuit: company.cuit,
    razonSocial: company.razonSocial,
    nombreFantasia: company.nombreFantasia ?? '',
    isActive: company.isActive,
    defaultEntryTime: company.defaultEntryTime ?? '',
    defaultExitTime: company.defaultExitTime ?? '',
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

export function AdminCompaniesManager({ companies }: { companies: CompanySummary[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<FormMode>('create');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerState>(null);

  const openCreate = () => {
    setMode('create');
    setSelectedCompanyId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (company: CompanySummary) => {
    setMode('edit');
    setSelectedCompanyId(company.id);
    setForm(toFormValues(company));
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isPending) return;
    setIsModalOpen(false);
    setSelectedCompanyId(null);
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
    };

    if (!payload.cuit || !payload.razonSocial) {
      setFormError('Completá CUIT y razón social.');
      return;
    }

    startTransition(() => {
      const request =
        mode === 'create'
          ? createCompanyAction(payload)
          : updateCompanyAction(selectedCompanyId ?? '', payload);

      void request
        .then((result: CompanyActionResult) => {
          if (result.error) {
            setFormError(result.error);
            return;
          }

          setIsModalOpen(false);
          setSelectedCompanyId(null);
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

          if (selectedCompanyId === company.id) {
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
      <section className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Empresas registradas</h2>
            <p className="text-sm text-gray-500 mt-1">{companies.length} empresas cargadas</p>
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
                <th className="px-6 py-4 text-left font-semibold">CUIT</th>
                <th className="px-6 py-4 text-left font-semibold">Razón social</th>
                <th className="px-6 py-4 text-left font-semibold">Nombre fantasía</th>
                <th className="px-6 py-4 text-left font-semibold">Estado</th>
                <th className="px-6 py-4 text-left font-semibold">Actualizada</th>
                <th className="px-6 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No hay empresas registradas todavía.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{company.cuit}</td>
                    <td className="px-6 py-4 text-gray-700">{company.razonSocial}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {company.nombreFantasia || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          company.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {company.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(company.updatedAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(company)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(company)}
                          disabled={isPending}
                          className="text-red-500 hover:text-red-600 font-medium transition-colors disabled:opacity-60"
                        >
                          Eliminar
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
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {mode === 'create' ? 'Crear empresa' : 'Editar empresa'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configurá los datos básicos para operar la empresa en CONFLUNET.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                  <input
                    name="cuit"
                    value={form.cuit}
                    onChange={handleChange}
                    required
                    inputMode="numeric"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={handleChange}
                    />
                    Empresa activa
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón social
                </label>
                <input
                  name="razonSocial"
                  value={form.razonSocial}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre fantasía
                </label>
                <input
                  name="nombreFantasia"
                  value={form.nombreFantasia}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entrada global
                  </label>
                  <input
                    name="defaultEntryTime"
                    type="time"
                    value={form.defaultEntryTime}
                    onChange={handleChange}
                    step={60}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salida global
                  </label>
                  <input
                    name="defaultExitTime"
                    type="time"
                    value={form.defaultExitTime}
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
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {isPending
                    ? 'Guardando...'
                    : mode === 'create'
                      ? 'Crear empresa'
                      : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
