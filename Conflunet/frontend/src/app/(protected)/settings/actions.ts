'use server';

import { revalidatePath } from 'next/cache';
import {
  createScheduleProfile,
  deleteScheduleProfile,
  type ScheduleProfileDayRule,
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
  defaultWorkDays?: string[] | null;
}): Promise<CompanySettingsActionResult> {
  try {
    await updateCompanySettings({
      defaultEntryTime: cleanText(input.defaultEntryTime) || null,
      defaultExitTime: cleanText(input.defaultExitTime) || null,
      defaultWorkDays: input.defaultWorkDays?.length ? input.defaultWorkDays : null,
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
  lateToleranceMinutes?: number | string | null;
  earlyDepartureToleranceMinutes?: number | string | null;
  expectedMinutesPerDay?: number | string | null;
  breakMinutes?: number | string | null;
  overtimeAfterMinutes?: number | string | null;
  rotationMode?: 'none' | 'weekly' | 'daily_cycle';
  rotationStartDate?: string | null;
  rotationLengthWeeks?: number | string | null;
  rotationLengthDays?: number | string | null;
  timeBankEnabled?: boolean;
  timeBankMode?: 'none' | 'overtime_only' | 'overtime_and_deficit';
  workDays?: string[] | null;
  dayRules?: Omit<ScheduleProfileDayRule, 'id' | 'scheduleProfileId' | 'createdAt' | 'updatedAt'>[];
}): Promise<CompanySettingsActionResult> {
  const numberOrDefault = (value: number | string | null | undefined, fallback: number) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const nullableNumber = (value: number | string | null | undefined) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
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
    lateToleranceMinutes: numberOrDefault(input.lateToleranceMinutes, 0),
    earlyDepartureToleranceMinutes: numberOrDefault(input.earlyDepartureToleranceMinutes, 0),
    expectedMinutesPerDay: nullableNumber(input.expectedMinutesPerDay),
    breakMinutes: numberOrDefault(input.breakMinutes, 0),
    overtimeAfterMinutes: numberOrDefault(input.overtimeAfterMinutes, 0),
    rotationMode: input.rotationMode ?? 'none',
    rotationStartDate: cleanText(input.rotationStartDate) || null,
    rotationLengthWeeks: nullableNumber(input.rotationLengthWeeks),
    rotationLengthDays: nullableNumber(input.rotationLengthDays),
    timeBankEnabled: input.timeBankEnabled ?? false,
    timeBankMode: input.timeBankEnabled ? input.timeBankMode ?? 'overtime_only' : 'none',
    workDays: input.workDays?.length ? input.workDays : null,
    dayRules: input.dayRules,
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
