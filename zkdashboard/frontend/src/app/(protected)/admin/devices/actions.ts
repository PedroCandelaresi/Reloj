'use server';

import { revalidatePath } from 'next/cache';
import {
  assignAdminDeviceCompany,
  unassignAdminDeviceCompany,
  sendAdminDeviceCommand,
} from '@/lib/api';

export interface AdminDeviceActionResult {
  ok?: true;
  error?: string;
}

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateAdminViews() {
  revalidatePath('/admin/devices');
  revalidatePath('/dashboard');
  revalidatePath('/records');
}

export async function assignDeviceCompanyAction(input: {
  deviceId: number;
  companyId: string;
  alias?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<AdminDeviceActionResult> {
  if (!Number.isInteger(input.deviceId) || input.deviceId <= 0) {
    return { error: 'Dispositivo inválido.' };
  }

  const companyId = cleanText(input.companyId);
  if (!companyId) {
    return { error: 'Seleccioná una empresa.' };
  }

  try {
    await assignAdminDeviceCompany(input.deviceId, {
      companyId,
      alias: cleanText(input.alias) || null,
      address: cleanText(input.address) || null,
      email: cleanText(input.email) || null,
      phone: cleanText(input.phone) || null,
    });
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo asignar el dispositivo.') };
  }
}

export async function unassignDeviceCompanyAction(
  deviceId: number,
): Promise<AdminDeviceActionResult> {
  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    return { error: 'Dispositivo inválido.' };
  }

  try {
    await unassignAdminDeviceCompany(deviceId);
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo desasignar el dispositivo.') };
  }
}

export async function sendDeviceCommandAction(
  deviceId: number,
  commandType: string,
): Promise<AdminDeviceActionResult> {
  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    return { error: 'Dispositivo inválido.' };
  }
  if (!commandType) {
    return { error: 'Tipo de comando requerido.' };
  }

  try {
    await sendAdminDeviceCommand(deviceId, commandType);
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo enviar el comando.') };
  }
}
