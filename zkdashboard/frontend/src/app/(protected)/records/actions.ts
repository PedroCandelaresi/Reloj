'use server';

import { requestDeviceForceSync } from '@/lib/api';

export interface DeviceSyncActionResult {
  ok?: true;
  duplicate?: boolean;
  message?: string;
  error?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function requestDeviceForceSyncAction(
  deviceId: number,
): Promise<DeviceSyncActionResult> {
  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    return { error: 'Seleccioná un dispositivo válido.' };
  }

  try {
    const result = await requestDeviceForceSync(deviceId);
    return {
      ok: true,
      duplicate: result.duplicate,
      message: result.message,
    };
  } catch (error) {
    return {
      error: getErrorMessage(error, 'No se pudo solicitar la sincronización del reloj.'),
    };
  }
}
