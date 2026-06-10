export const STATUS_LABELS: Record<number, string> = {
  0: 'Entrada',
  1: 'Salida',
  2: 'Descanso Sal.',
  3: 'Descanso Ent.',
  4: 'Entrada extra informada',
  5: 'Salida extra informada',
};

export function formatEmployeeName(employee?: {
  id?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  document?: string | null;
} | null) {
  const apellido = (employee?.apellido ?? employee?.lastName ?? '').trim();
  const nombre = (employee?.nombre ?? employee?.firstName ?? '').trim();
  const fullName = [apellido, nombre].filter(Boolean).join(', ');

  return fullName || employee?.name?.trim() || employee?.document?.trim() || employee?.id?.trim() || null;
}

export function formatAttendanceUser(record: {
  userId: string;
  employee?: {
    nombre?: string | null;
    apellido?: string | null;
  } | null;
}) {
  return formatEmployeeName(record.employee) ?? record.userId;
}

export function formatAttendanceUserOption(option: {
  userId: string;
  employee?: {
    nombre?: string | null;
    apellido?: string | null;
  } | null;
}) {
  const fullName = formatEmployeeName(option.employee);
  return fullName ? `${fullName} (${option.userId})` : option.userId;
}
