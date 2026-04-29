import type { Device, DeviceStatus } from '@/lib/api';

type DeviceLike = Pick<Device, 'alias' | 'name' | 'serialNumber' | 'status' | 'online' | 'computedState' | 'minutesSinceLastSeen'> & {
  model?: string | null;
  modelName?: string | null;
  deviceModel?: string | null;
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  online: 'Conectado',
  offline: 'Desconectado',
  idle: 'Sin actividad reciente',
  never_seen: 'Nunca conectado',
  disabled: 'Deshabilitado',
  communicating: 'Comunicándose',
  pending_commands: 'Tareas pendientes',
  error: 'Con errores',
};

export const DEVICE_COMMAND_LABELS: Record<string, string> = {
  query_attlog: 'Pedir fichadas',
  attendance_sync: 'Sincronizar fichadas',
  check_time: 'Verificar conexión',
  check: 'Verificar conexión',
  set_time: 'Sincronizar hora',
  reboot: 'Reiniciar reloj',
  clear_attlog: 'Borrar registros del reloj',
  query_userinfo: 'Consultar usuarios del reloj',
  update_userinfo: 'Enviar empleado al reloj',
};

export const DEVICE_COMMAND_STATUS_LABELS: Record<string, string> = {
  pending: 'Esperando',
  sent: 'Enviado al reloj',
  acknowledged: 'Confirmado por el reloj',
  failed: 'Falló',
  expired: 'Venció',
};

export function getCompanyDeviceName(device: DeviceLike) {
  const candidates = [device.alias, device.name];
  const label = candidates.find((value) => {
    const clean = value?.trim();
    if (!clean) return false;
    return clean !== device.serialNumber && !clean.includes(device.serialNumber);
  });
  return label?.trim() || 'Reloj sin nombre';
}

export function getCompanyDeviceModel(device: DeviceLike) {
  const explicitModel = device.model || device.modelName || device.deviceModel;
  if (explicitModel) return formatDeviceModel(explicitModel);

  const serialModel = inferModelFromSerial(device.serialNumber);
  return serialModel || 'Modelo no informado';
}

function inferModelFromSerial(serialNumber?: string | null) {
  if (!serialNumber) return null;
  const normalized = serialNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.includes('MB360')) return 'MB-360';
  if (normalized.includes('MB460')) return 'MB-460';
  if (normalized.includes('MB560')) return 'MB-560';
  return null;
}

function formatDeviceModel(model: string) {
  const normalized = model.trim();
  if (/^MB\s*-?\s*360$/i.test(normalized)) return 'MB-360';
  if (/^MB\s*-?\s*460$/i.test(normalized)) return 'MB-460';
  if (/^MB\s*-?\s*560$/i.test(normalized)) return 'MB-560';
  return normalized;
}

export function getDeviceStatusLabel(status?: DeviceStatus | string | null) {
  if (!status) return 'Sin estado';
  return DEVICE_STATUS_LABELS[status as DeviceStatus] || status;
}

export function getDeviceStatusClasses(status?: DeviceStatus | string | null) {
  switch (status) {
    case 'online':
    case 'communicating':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'idle':
    case 'pending_commands':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'offline':
    case 'error':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'never_seen':
    case 'disabled':
    default:
      return 'bg-gray-200 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400';
  }
}

export function formatLastCommunication(device: DeviceLike) {
  const minutes = device.minutesSinceLastSeen ?? device.computedState?.minutesSinceLastSeen ?? null;
  const status = device.computedState?.state || device.status;
  if (minutes === null || minutes === undefined) return 'Nunca conectado';
  const suffix = minutes === 1 ? '1 minuto' : `${minutes} minutos`;
  if (status === 'online' || status === 'communicating' || device.online) return `Conectado hace ${suffix}`;
  return `Sin conexión hace ${suffix}`;
}

export function getDeviceCommandLabel(commandType?: string | null) {
  if (!commandType) return 'Tarea del reloj';
  return DEVICE_COMMAND_LABELS[commandType] || 'Tarea del reloj';
}

export function getDeviceCommandStatusLabel(status?: string | null) {
  if (!status) return 'Sin estado';
  return DEVICE_COMMAND_STATUS_LABELS[status] || status;
}

export function humanizeActionError(error?: string | null) {
  if (!error) return 'Ocurrió un error inesperado. Intentá nuevamente o contactá soporte.';
  const normalized = error.toLowerCase();
  if (normalized.includes('403') || normalized.includes('forbidden')) {
    return 'No tenés permisos para realizar esta acción.';
  }
  if (normalized.includes('401') || normalized.includes('unauthorized')) {
    return 'Tu sesión venció. Volvé a iniciar sesión.';
  }
  if (normalized.includes('400') || normalized.includes('badrequest') || normalized.includes('bad request')) {
    return 'No se pudo completar la acción. Revisá los datos ingresados.';
  }
  if (normalized.includes('500') || normalized.includes('internal server error')) {
    return 'Ocurrió un error inesperado. Intentá nuevamente o contactá soporte.';
  }
  if (normalized.includes('failed to fetch')) {
    return 'No se pudo conectar con el servidor. Verificá tu conexión o intentá más tarde.';
  }
  return error;
}

export function getJustificationLabel(status?: string | null) {
  switch (status) {
    case 'approved':
      return 'Justificado';
    case 'pending':
      return 'Pendiente de revisión';
    case 'rejected':
      return 'Rechazado';
    case 'none':
    case undefined:
    case null:
      return 'Sin justificar';
    default:
      return status;
  }
}

export function getAttendanceJustificationLabel({
  isAbsent,
  lateMinutes,
  justificationStatus,
}: {
  isAbsent?: boolean;
  lateMinutes?: number;
  justificationStatus?: string | null;
}) {
  if (isAbsent) {
    return justificationStatus === 'approved' ? 'Ausente justificado' : 'Ausente sin justificar';
  }
  if ((lateMinutes ?? 0) > 0) {
    return justificationStatus === 'approved' ? 'Tardanza justificada' : 'Tardanza sin justificar';
  }
  return getJustificationLabel(justificationStatus);
}
