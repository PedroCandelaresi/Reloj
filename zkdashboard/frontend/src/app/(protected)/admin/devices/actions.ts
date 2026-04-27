'use server';

import { revalidatePath } from 'next/cache';
import {
  assignAdminDeviceCompany,
  unassignAdminDeviceCompany,
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
