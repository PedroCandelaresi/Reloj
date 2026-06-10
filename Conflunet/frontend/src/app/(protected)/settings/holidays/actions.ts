'use server';

import { revalidatePath } from 'next/cache';
import {
  createHoliday,
  deleteHoliday,
  updateHoliday,
  type HolidayInput,
} from '@/lib/api';

export interface HolidayActionResult {
  ok?: true;
  error?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function cleanHolidayInput(input: HolidayInput): HolidayInput {
  return {
    date: input.date,
    name: input.name.trim(),
    type: input.type || 'company',
    isWorkable: Boolean(input.isWorkable),
    companyId: input.companyId || null,
  };
}

export async function saveHolidayAction(input: HolidayInput & { id?: string }): Promise<HolidayActionResult> {
  try {
    const payload = cleanHolidayInput(input);
    if (input.id) {
      await updateHoliday(input.id, payload);
    } else {
      await createHoliday(payload);
    }
    revalidatePath('/settings/holidays');
    revalidatePath('/reports/day-summaries');
    revalidatePath('/reports/monthly-summary');
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo guardar el feriado.') };
  }
}

export async function deleteHolidayAction(id: string): Promise<HolidayActionResult> {
  try {
    await deleteHoliday(id);
    revalidatePath('/settings/holidays');
    revalidatePath('/reports/day-summaries');
    revalidatePath('/reports/monthly-summary');
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo eliminar el feriado.') };
  }
}
