export interface EmployeeNameLike {
  id?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}

function cleanNamePart(value: string | null | undefined): string {
  return (value ?? '').replace(/[\r\n\t=]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getEmployeeDisplayName(employee: EmployeeNameLike | null | undefined): string {
  if (!employee) return '';

  const apellido = cleanNamePart(employee.apellido ?? employee.lastName);
  const nombre = cleanNamePart(employee.nombre ?? employee.firstName);
  const fullName = [apellido, nombre].filter(Boolean).join(', ');

  return fullName || cleanNamePart(employee.name) || cleanNamePart(employee.id);
}

export function getEmployeeDeviceName(employee: EmployeeNameLike | null | undefined): string {
  if (!employee) return '';

  const nombre = cleanNamePart(employee.nombre ?? employee.firstName);
  const apellido = cleanNamePart(employee.apellido ?? employee.lastName);
  const fullName = [nombre, apellido].filter(Boolean).join(' ');

  return fullName || cleanNamePart(employee.name) || '';
}
