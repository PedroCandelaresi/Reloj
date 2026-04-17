import { cookies } from 'next/headers';

const API = process.env.API_URL || 'http://localhost:4370';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `API error ${res.status}: ${path}`;
    const body = await res.text();

    if (body) {
      try {
        const payload = JSON.parse(body);
        if (typeof payload.message === 'string') {
          message = payload.message;
        } else if (Array.isArray(payload.message) && payload.message.length > 0) {
          message = payload.message.join(', ');
        } else if (typeof payload.error === 'string') {
          message = payload.error;
        } else {
          message = body;
        }
      } catch {
        message = body;
      }
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export interface EmployeeSummary {
  id: string;
  nombre: string;
  apellido: string;
}

export interface Employee extends EmployeeSummary {
  telefono: string | null;
  email: string | null;
  createdAt: string;
}

export interface EmployeeInput {
  id: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
}

export interface EmployeeUpdateInput {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  email?: string | null;
}

export interface CurrentUserProfile {
  id: number;
  username: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  createdAt: string;
}

export interface CurrentUserProfileInput {
  nombre?: string | null;
  apellido?: string | null;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AttendanceRecord {
  id: number;
  deviceSn: string;
  userId: string;
  timestamp: string;
  status: number;
  verifyType: number;
  workCode: string | null;
  employee?: EmployeeSummary | null;
}

export interface AttendanceUserOption {
  userId: string;
  employee: EmployeeSummary | null;
}

export interface Device {
  id: number;
  serialNumber: string;
  ipAddress: string | null;
  lastSeen: string;
  isActive: boolean;
}

export interface DeviceCommand {
  id: number;
  deviceId: number;
  commandType: string;
  command: string;
  status: string;
  requestedBy: string | null;
  requestedAt: string;
  sentAt: string | null;
  acknowledgedAt: string | null;
  responsePayload: string | null;
  error: string | null;
}

export interface DeviceForceSyncResult {
  ok: true;
  duplicate: boolean;
  message: string;
  device: Device;
  command: DeviceCommand;
}

export interface Stats {
  totalToday: number;
  totalWeek: number;
  totalAll: number;
}

export interface PaginatedResult {
  data: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const STATUS_LABELS: Record<number, string> = {
  0: 'Entrada',
  1: 'Salida',
  2: 'Descanso Sal.',
  3: 'Descanso Ent.',
  4: 'Extra Entrada',
  5: 'Extra Salida',
};

export const VERIFY_LABELS: Record<number, string> = {
  0: 'Contraseña',
  1: 'Huella',
  4: 'Rostro',
  15: 'Tarjeta',
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

export function formatAttendanceUserOption(option: AttendanceUserOption) {
  const fullName = formatEmployeeName(option.employee);
  return fullName ? `${fullName} (${option.userId})` : option.userId;
}

export function getStats() {
  return apiFetch<Stats>('/attendance/stats');
}

export function getRecent() {
  return apiFetch<AttendanceRecord[]>('/attendance/recent');
}

export function getDevices() {
  return apiFetch<Device[]>('/devices');
}

export function requestDeviceForceSync(deviceId: number) {
  return apiFetch<DeviceForceSyncResult>(`/devices/${deviceId}/force-sync`, {
    method: 'POST',
  });
}

export function getDistinctUsers() {
  return apiFetch<AttendanceUserOption[]>('/attendance/users');
}

export function getEmployees() {
  return apiFetch<Employee[]>('/employees');
}

export function getEmployee(id: string) {
  return apiFetch<Employee>(`/employees/${id}`);
}

export function getCurrentUserProfile() {
  return apiFetch<CurrentUserProfile>('/auth/me');
}

export function updateCurrentUserProfile(input: CurrentUserProfileInput) {
  return apiFetch<CurrentUserProfile>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function changeCurrentUserPassword(input: ChangePasswordInput) {
  return apiFetch<{ success: true }>('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function createEmployee(input: EmployeeInput) {
  return apiFetch<Employee>('/employees', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateEmployee(id: string, input: EmployeeUpdateInput) {
  return apiFetch<Employee>(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteEmployee(id: string) {
  return apiFetch<{ success: true }>(`/employees/${id}`, {
    method: 'DELETE',
  });
}

export function getRecords(params: {
  page?: number;
  limit?: number;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.userId) qs.set('userId', params.userId);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  const search = qs.toString();
  return apiFetch<PaginatedResult>(`/attendance${search ? `?${search}` : ''}`);
}
