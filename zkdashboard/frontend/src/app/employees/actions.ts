'use server';

import { revalidatePath } from 'next/cache';
import {
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from '@/lib/api';
import type { EmployeeInput, EmployeeUpdateInput } from '@/lib/api';

interface ActionResult {
  ok?: true;
  error?: string;
}

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateEmployeeViews() {
  revalidatePath('/employees');
  revalidatePath('/dashboard');
  revalidatePath('/records');
}

export async function createEmployeeAction(input: EmployeeInput): Promise<ActionResult> {
  const id = cleanText(input.id);
  const nombre = cleanText(input.nombre);
  const apellido = cleanText(input.apellido);
  const telefono = cleanText(input.telefono);

  if (!id || !nombre || !apellido) {
    return { error: 'Completá DNI, nombre y apellido.' };
  }

  try {
    await createEmployee({
      id,
      nombre,
      apellido,
      telefono: telefono || null,
    });
    revalidateEmployeeViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo crear el empleado.') };
  }
}

export async function updateEmployeeAction(
  id: string,
  input: EmployeeUpdateInput,
): Promise<ActionResult> {
  const cleanId = cleanText(id);
  const nombre = cleanText(input.nombre);
  const apellido = cleanText(input.apellido);
  const telefono = cleanText(input.telefono);

  if (!cleanId || !nombre || !apellido) {
    return { error: 'Completá DNI, nombre y apellido.' };
  }

  try {
    await updateEmployee(cleanId, {
      nombre,
      apellido,
      telefono: telefono || null,
    });
    revalidateEmployeeViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo actualizar el empleado.') };
  }
}

export async function deleteEmployeeAction(id: string): Promise<ActionResult> {
  const cleanId = cleanText(id);

  if (!cleanId) {
    return { error: 'DNI inválido.' };
  }

  try {
    await deleteEmployee(cleanId);
    revalidateEmployeeViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo eliminar el empleado.') };
  }
}
