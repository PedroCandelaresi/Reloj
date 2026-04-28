'use server';

import { revalidatePath } from 'next/cache';
import {
  createEmployee,
  deleteEmployee,
  getDeviceUserReconciliation,
  queryDeviceUsers,
  requestEmployeeExportToDevice,
  requestEmployeeImportFromDevice,
  syncDeviceEmployeeUser,
  updateEmployee,
} from '@/lib/api';
import type { DeviceUserReconciliation, EmployeeInput, EmployeeUpdateInput } from '@/lib/api';

export interface ActionResult {
  ok?: true;
  message?: string;
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
  const email = cleanText(input.email);
  const entryTime = cleanText(input.entryTime);
  const exitTime = cleanText(input.exitTime);
  const scheduleProfileId = cleanText(input.scheduleProfileId);

  if (!id || !nombre || !apellido) {
    return { error: 'Completá DNI, nombre y apellido.' };
  }

  try {
    await createEmployee({
      id,
      nombre,
      apellido,
      telefono: telefono || null,
      email: email || null,
      entryTime: entryTime || null,
      exitTime: exitTime || null,
      scheduleProfileId: scheduleProfileId || null,
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
  const email = cleanText(input.email);
  const entryTime = cleanText(input.entryTime);
  const exitTime = cleanText(input.exitTime);
  const scheduleProfileId = cleanText(input.scheduleProfileId);

  if (!cleanId || !nombre || !apellido) {
    return { error: 'Completá DNI, nombre y apellido.' };
  }

  try {
    await updateEmployee(cleanId, {
      nombre,
      apellido,
      telefono: telefono || null,
      email: email || null,
      entryTime: entryTime || null,
      exitTime: exitTime || null,
      scheduleProfileId: scheduleProfileId || null,
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

export async function importEmployeesFromDeviceAction(deviceId: number): Promise<ActionResult> {
  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    return { error: 'Seleccioná un reloj válido.' };
  }

  try {
    const result = await requestEmployeeImportFromDevice(deviceId);
    revalidateEmployeeViews();
    return { ok: true, message: result.message };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo solicitar la importación desde el reloj.') };
  }
}

export async function getDeviceUserReconciliationAction(
  deviceId: number,
): Promise<(ActionResult & { data?: DeviceUserReconciliation })> {
  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    return { error: 'Seleccioná un reloj válido.' };
  }

  try {
    const data = await getDeviceUserReconciliation(deviceId);
    return { ok: true, data };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo consultar la conciliación del reloj.') };
  }
}

export async function queryDeviceUsersAction(deviceId: number): Promise<ActionResult> {
  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    return { error: 'Seleccioná un reloj válido.' };
  }

  try {
    const result = await queryDeviceUsers(deviceId);
    revalidateEmployeeViews();
    return { ok: true, message: result.message };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo solicitar USERINFO al reloj.') };
  }
}

export async function exportEmployeeToDeviceAction(
  deviceId: number,
  employeeId: string,
): Promise<ActionResult> {
  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    return { error: 'Seleccioná un reloj válido.' };
  }
  const cleanEmployeeId = cleanText(employeeId);
  if (!cleanEmployeeId) {
    return { error: 'Empleado inválido.' };
  }

  try {
    const result = await requestEmployeeExportToDevice(deviceId, cleanEmployeeId);
    revalidateEmployeeViews();
    return { ok: true, message: result.message };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo enviar el empleado al reloj.') };
  }
}

export async function syncDeviceEmployeeUserAction(
  deviceId: number,
  employeeId: string,
): Promise<ActionResult> {
  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    return { error: 'Seleccioná un reloj válido.' };
  }
  const cleanEmployeeId = cleanText(employeeId);
  if (!cleanEmployeeId) {
    return { error: 'Empleado inválido.' };
  }

  try {
    const result = await syncDeviceEmployeeUser(deviceId, cleanEmployeeId);
    revalidateEmployeeViews();
    return { ok: true, message: result.message };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo enviar el empleado al reloj.') };
  }
}
