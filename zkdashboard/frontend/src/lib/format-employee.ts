export const STATUS_LABELS: Record<number, string> = {
  0: 'Entrada',
  1: 'Salida',
  2: 'Descanso Sal.',
  3: 'Descanso Ent.',
  4: 'Extra Entrada',
  5: 'Extra Salida',
};

export function formatEmployeeName(employee?: {
  nombre?: string | null;
  apellido?: string | null;
} | null) {
  const apellido = employee?.apellido?.trim() ?? '';
  const nombre = employee?.nombre?.trim() ?? '';
  const fullName = [apellido, nombre].filter(Boolean).join(', ');

  return fullName || null;
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
