'use server';

import { revalidatePath } from 'next/cache';
import {
  createCompanyUser,
  deleteCompanyUser,
  updateCompanyUser,
} from '@/lib/api';
import type { CompanyRole } from '@/lib/auth-token';

export interface CompanyUserActionResult {
  ok?: true;
  error?: string;
}

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateUsersView() {
  revalidatePath('/users');
  revalidatePath('/dashboard');
}

export async function createCompanyUserAction(input: {
  employeeId: string;
  username: string;
  password: string;
  role: CompanyRole;
}): Promise<CompanyUserActionResult> {
  const employeeId = cleanText(input.employeeId);
  const username = cleanText(input.username);
  const password = cleanText(input.password);

  if (!employeeId || !username || !password) {
    return { error: 'Seleccioná empleado, usuario y contraseña.' };
  }

  try {
    await createCompanyUser({
      employeeId,
      username,
      password,
      role: input.role,
    });
    revalidateUsersView();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo crear el usuario.') };
  }
}

export async function updateCompanyUserAction(
  userId: number,
  input: {
    username?: string;
    password?: string;
    role?: CompanyRole;
  },
): Promise<CompanyUserActionResult> {
  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: 'Usuario inválido.' };
  }

  const username = cleanText(input.username);
  const password = cleanText(input.password);

  try {
    await updateCompanyUser(userId, {
      username: username || undefined,
      password: password || undefined,
      role: input.role,
    });
    revalidateUsersView();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo actualizar el usuario.') };
  }
}

export async function deleteCompanyUserAction(
  userId: number,
): Promise<CompanyUserActionResult> {
  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: 'Usuario inválido.' };
  }

  try {
    await deleteCompanyUser(userId);
    revalidateUsersView();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo remover el usuario.') };
  }
}
