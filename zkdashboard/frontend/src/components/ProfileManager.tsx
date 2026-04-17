'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent, InputHTMLAttributes } from 'react';
import type { CurrentUserProfile } from '@/lib/api';
import type { ActionResult } from '@/app/(protected)/profile/actions';
import { updateProfileAction } from '@/app/(protected)/profile/actions';

type ProfileFormValues = {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
};

type BannerState =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

function formatDisplayName(profile: CurrentUserProfile) {
  const fullName = [profile.nombre?.trim(), profile.apellido?.trim()].filter(Boolean).join(' ');
  return fullName || profile.username;
}

export function ProfileManager({ profile }: { profile: CurrentUserProfile }) {
  const router = useRouter();
  const [isProfilePending, startProfileTransition] = useTransition();
  const [profileBanner, setProfileBanner] = useState<BannerState>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormValues>({
    nombre: profile.nombre ?? '',
    apellido: profile.apellido ?? '',
    dni: profile.dni ?? '',
    telefono: profile.telefono ?? '',
    email: profile.email ?? '',
  });

  const handleProfileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileBanner(null);

    startProfileTransition(() => {
      void updateProfileAction({
        nombre: profileForm.nombre,
        apellido: profileForm.apellido,
        dni: profileForm.dni,
        telefono: profileForm.telefono,
        email: profileForm.email,
      })
        .then((result: ActionResult) => {
          if (result.error) {
            setProfileBanner({ type: 'error', text: result.error });
            return;
          }

          setProfileBanner({ type: 'success', text: 'Perfil actualizado correctamente.' });
          router.refresh();
        })
        .catch(() => {
          setProfileBanner({ type: 'error', text: 'No se pudo actualizar el perfil.' });
        });
    });
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-sm text-gray-500 mt-1">
                {formatDisplayName(profile)} · usuario {profile.username}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-100 bg-gray-50/60">
          <InfoItem label="Usuario" value={profile.username} />
          <InfoItem label="Alta" value={new Date(profile.createdAt).toLocaleString('es-AR')} />
          <InfoItem label="DNI actual" value={profile.dni || '—'} />
        </div>

        <form onSubmit={handleProfileSubmit} className="px-6 py-6 space-y-5">
          {profileBanner && <Banner {...profileBanner} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Apellido"
              name="apellido"
              value={profileForm.apellido}
              onChange={handleProfileChange}
            />
            <Field
              label="Nombre"
              name="nombre"
              value={profileForm.nombre}
              onChange={handleProfileChange}
            />
            <Field
              label="DNI"
              name="dni"
              value={profileForm.dni}
              onChange={handleProfileChange}
              inputMode="numeric"
            />
            <Field
              label="Teléfono"
              name="telefono"
              value={profileForm.telefono}
              onChange={handleProfileChange}
            />
            <div className="md:col-span-2">
              <Field
                label="Email"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={handleProfileChange}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProfilePending}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isProfilePending ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Seguridad</h2>
          <p className="text-sm text-gray-500 mt-1">
            El cambio de contraseña está disponible en una pantalla separada para mantener el perfil más ordenado.
          </p>
        </div>
        <div className="px-6 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Cambiar contraseña</p>
            <p className="text-sm text-gray-500 mt-1">
              Actualizá tus credenciales de acceso desde la sección exclusiva de seguridad.
            </p>
          </div>
          <Link
            href="/profile/password"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Ir a cambiar contraseña
          </Link>
        </div>
      </section>
    </div>
  );
}

function Field(props: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{props.label}</label>
      <input
        name={props.name}
        type={props.type ?? 'text'}
        value={props.value}
        onChange={props.onChange}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-1">{value}</p>
    </div>
  );
}

function Banner({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {text}
    </div>
  );
}
