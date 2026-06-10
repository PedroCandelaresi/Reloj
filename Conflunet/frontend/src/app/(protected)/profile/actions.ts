'use server';

import { revalidatePath } from 'next/cache';
import {
  changeCurrentUserPassword,
  updateCurrentUserProfile,
} from '@/lib/api';
import type {
  ChangePasswordInput,
  CurrentUserProfileInput,
} from '@/lib/api';

export interface ActionResult {
  ok?: true;
  error?: string;
}

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateProtectedViews() {
  revalidatePath('/profile');
  revalidatePath('/dashboard');
  revalidatePath('/employees');
  revalidatePath('/records');
}

export async function updateProfileAction(input: CurrentUserProfileInput): Promise<ActionResult> {
  const nombre = cleanText(input.nombre);
  const apellido = cleanText(input.apellido);
  const dni = cleanText(input.dni);
  const telefono = cleanText(input.telefono);
  const email = cleanText(input.email);

  try {
    await updateCurrentUserProfile({
      nombre: nombre || null,
      apellido: apellido || null,
      dni: dni || null,
      telefono: telefono || null,
      email: email || null,
    });
    revalidateProtectedViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo actualizar el perfil.') };
  }
}

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  const currentPassword = cleanText(input.currentPassword);
  const newPassword = cleanText(input.newPassword);

  if (!currentPassword || !newPassword) {
    return { error: 'Completá la contraseña actual y la nueva.' };
  }

  if (newPassword.length < 6) {
    return { error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
  }

  try {
    await changeCurrentUserPassword({ currentPassword, newPassword });
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo cambiar la contraseña.') };
  }
}
