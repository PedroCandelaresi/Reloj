'use server';

import { revalidatePath } from 'next/cache';
import { updateCompanySettings } from '@/lib/api';

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
