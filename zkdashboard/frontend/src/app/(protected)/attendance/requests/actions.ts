'use server';

import { revalidatePath } from 'next/cache';
import {
  approveAttendanceRequest,
  cancelAttendanceRequest,
  createAttendanceRequest,
  rejectAttendanceRequest,
  type AttendanceRequestInput,
} from '@/lib/api';

export interface AttendanceRequestActionResult {
  ok?: true;
  error?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function createAttendanceRequestAction(input: AttendanceRequestInput): Promise<AttendanceRequestActionResult> {
  try {
    await createAttendanceRequest(input);
    revalidatePath('/attendance/requests');
    revalidatePath('/reports/day-summaries');
    revalidatePath('/reports/monthly-summary');
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo crear la solicitud.') };
  }
}

export async function approveAttendanceRequestAction(id: string, reviewNotes?: string): Promise<AttendanceRequestActionResult> {
  try {
    await approveAttendanceRequest(id, reviewNotes);
    revalidatePath('/attendance/requests');
    revalidatePath('/reports/day-summaries');
    revalidatePath('/reports/monthly-summary');
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo aprobar la solicitud.') };
  }
}

export async function rejectAttendanceRequestAction(id: string, reviewNotes: string): Promise<AttendanceRequestActionResult> {
  try {
    await rejectAttendanceRequest(id, reviewNotes);
    revalidatePath('/attendance/requests');
    revalidatePath('/reports/day-summaries');
    revalidatePath('/reports/monthly-summary');
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo rechazar la solicitud.') };
  }
}

export async function cancelAttendanceRequestAction(id: string): Promise<AttendanceRequestActionResult> {
  try {
    await cancelAttendanceRequest(id);
    revalidatePath('/attendance/requests');
    revalidatePath('/reports/day-summaries');
    revalidatePath('/reports/monthly-summary');
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo cancelar la solicitud.') };
  }
}
