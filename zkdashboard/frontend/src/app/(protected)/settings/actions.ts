'use server';

import { revalidatePath } from 'next/cache';
import {
  createScheduleProfile,
  deleteScheduleProfile,
  updateCompanySettings,
  updateScheduleProfile,
} from '@/lib/api';

export interface CompanySettingsActionResult {
  ok?: true;
  error?: string;
}

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function updateCompanySettingsAction(input: {
  defaultEntryTime?: string | null;
  defaultExitTime?: string | null;
}): Promise<CompanySettingsActionResult> {
  try {
    await updateCompanySettings({
      defaultEntryTime: cleanText(input.defaultEntryTime) || null,
      defaultExitTime: cleanText(input.defaultExitTime) || null,
    });
    revalidatePath('/settings');
    revalidatePath('/employees');
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo guardar la configuración.') };
  }
}

export async function saveScheduleProfileAction(input: {
  id?: string;
  name: string;
  entryTime: string;
  exitTime: string;
  summerEntryTime?: string | null;
  summerExitTime?: string | null;
  summerStart?: string | null;
  summerEnd?: string | null;
  winterEntryTime?: string | null;
  winterExitTime?: string | null;
  winterStart?: string | null;
  winterEnd?: string | null;
}): Promise<CompanySettingsActionResult> {
  const payload = {
    name: cleanText(input.name),
    entryTime: cleanText(input.entryTime),
    exitTime: cleanText(input.exitTime),
    summerEntryTime: cleanText(input.summerEntryTime) || null,
    summerExitTime: cleanText(input.summerExitTime) || null,
    summerStart: cleanText(input.summerStart) || null,
    summerEnd: cleanText(input.summerEnd) || null,
    winterEntryTime: cleanText(input.winterEntryTime) || null,
    winterExitTime: cleanText(input.winterExitTime) || null,
    winterStart: cleanText(input.winterStart) || null,
    winterEnd: cleanText(input.winterEnd) || null,
  };

  try {
    if (input.id) {
      await updateScheduleProfile(input.id, payload);
    } else {
      await createScheduleProfile(payload);
    }
    revalidatePath('/settings');
    revalidatePath('/employees');
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo guardar el perfil horario.') };
  }
}

export async function deleteScheduleProfileAction(id: string): Promise<CompanySettingsActionResult> {
  try {
    await deleteScheduleProfile(id);
    revalidatePath('/settings');
    revalidatePath('/employees');
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo eliminar el perfil horario.') };
  }
}
