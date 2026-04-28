import { cookies } from 'next/headers';
import type { CompanyRole } from './auth-token';
export {
  STATUS_LABELS,
  formatAttendanceUser,
  formatAttendanceUserOption,
  formatEmployeeName,
} from './format-employee';

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
  entryTime: string | null;
  exitTime: string | null;
  scheduleProfileId: string | null;
  scheduleProfile?: ScheduleProfile | null;
  companyId: string | null;
  createdAt: string;
}

export interface EmployeeInput {
  id: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
  entryTime?: string | null;
  exitTime?: string | null;
  scheduleProfileId?: string | null;
  companyId?: string | null;
}

export interface EmployeeUpdateInput {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  email?: string | null;
  entryTime?: string | null;
  exitTime?: string | null;
  scheduleProfileId?: string | null;
  companyId?: string | null;
}

export interface CompanySummary {
  id: string;
  cuit: string;
  razonSocial: string;
  nombreFantasia: string | null;
  isActive: boolean;
  defaultEntryTime?: string | null;
  defaultExitTime?: string | null;
  defaultWorkDays?: string[] | null;
  email?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrentUserMembership {
  companyId: string;
  role: CompanyRole;
  company: CompanySummary | null;
}

export interface CurrentUserProfile {
  id: number;
  username: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  isSuperAdmin: boolean;
  employeeId: string | null;
  companyId: string | null;
  companyRole: CompanyRole | null;
  memberships: CurrentUserMembership[];
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
  deviceId: number | null;
  userId: string;
  companyId: string | null;
  timestamp: string;
  status: number;
  verifyType: number;
  workCode: string | null;
  source?: 'device' | 'manual' | 'correction' | 'import';
  employee?: EmployeeSummary | null;
}

export interface AttendanceUserOption {
  userId: string;
  employee: EmployeeSummary | null;
}

export interface Device {
  id: number;
  name: string;
  serialNumber: string;
  ipAddress: string | null;
  alias: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  company: CompanySummary | null;
  companyId: string | null;
  assignedAt: string | null;
  firstSeen: string;
  lastSeen: string;
  online: boolean;
  status: 'online' | 'offline';
  lastSyncAt: string | null;
  pendingCommandsCount: number;
  isActive: boolean;
}

export interface AdminDevice extends Device {
  company: CompanySummary | null;
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

export interface DashboardSummary {
  presentToday: number;
  recordsToday: number;
  recentRecords: AttendanceRecord[];
  devices: Device[];
  devicesOnline: number;
  devicesOffline: number;
  lastSyncAt: string | null;
  pendingCommands: number;
  recentDeviceErrorCount: number;
  recentDeviceErrors: Array<{
    id: string;
    serialNumber: string | null;
    path: string;
    responseStatus: number | null;
    parseError: string | null;
    receivedAt: string;
  }>;
  technicalNews: string[];
}

export interface AdminDashboardSummary {
  summary: {
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    totalEmployees: number;
    totalDevices: number;
    devicesOnline: number;
    devicesOffline: number;
    unassignedDevices: number;
    totalAttendanceToday: number;
    attendanceLast7Days: Array<{ date: string; count: number }>;
    attendanceCompanyNull: number;
    pendingCommands: number;
  };
  latestDevices: Array<{
    id: number;
    name: string;
    serialNumber: string;
    companyId: string | null;
    companyName: string | null;
    lastSeen: string | null;
    online: boolean;
  }>;
  latestCompanies: Array<{
    id: string;
    cuit: string;
    razonSocial: string;
    nombreFantasia: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  latestAdmsErrors: Array<{
    id: string;
    serialNumber: string | null;
    companyId: string | null;
    sourceIp: string | null;
    path: string;
    responseStatus: number | null;
    parseError: string | null;
    receivedAt: string;
  }>;
  companiesWithOfflineDevices: Array<{
    companyId: string | null;
    companyName: string;
    offlineDevices: number;
  }>;
  topCompaniesToday: Array<{
    companyId: string;
    companyName: string;
    count: number;
  }>;
  technicalAlerts: string[];
}

export interface CompanyInput {
  cuit: string;
  razonSocial: string;
  nombreFantasia?: string | null;
  isActive?: boolean;
  defaultEntryTime?: string | null;
  defaultExitTime?: string | null;
  defaultWorkDays?: string[] | null;
  email?: string | null;
  phone?: string | null;
}

export interface CompanyUpdateInput {
  cuit?: string;
  razonSocial?: string;
  nombreFantasia?: string | null;
  isActive?: boolean;
  defaultEntryTime?: string | null;
  defaultExitTime?: string | null;
  defaultWorkDays?: string[] | null;
  email?: string | null;
  phone?: string | null;
}

export interface CompanySettingsInput {
  defaultEntryTime?: string | null;
  defaultExitTime?: string | null;
  defaultWorkDays?: string[] | null;
}

export interface ScheduleProfile {
  id: string;
  companyId: string;
  name: string;
  entryTime: string;
  exitTime: string;
  summerEntryTime: string | null;
  summerExitTime: string | null;
  summerStart: string | null;
  summerEnd: string | null;
  winterEntryTime: string | null;
  winterExitTime: string | null;
  winterStart: string | null;
  winterEnd: string | null;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  expectedMinutesPerDay: number | null;
  workDays: string[] | null;
  breakMinutes: number;
  overtimeAfterMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleProfileInput {
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
  lateToleranceMinutes?: number;
  earlyDepartureToleranceMinutes?: number;
  expectedMinutesPerDay?: number | null;
  workDays?: string[] | null;
  breakMinutes?: number;
  overtimeAfterMinutes?: number;
}

export interface AssignAdminDeviceCompanyInput {
  companyId: string;
  alias?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CompanyUser {
  id: string;
  companyId: string;
  role: CompanyRole;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    isSuperAdmin: boolean;
    employeeId: string | null;
  } | null;
  employee: (EmployeeSummary & {
    telefono: string | null;
    email: string | null;
    companyId: string | null;
  }) | null;
}

export interface CompanyUserInput {
  employeeId: string;
  username?: string;
  password?: string;
  role: CompanyRole;
}

export interface CompanyUserUpdateInput {
  username?: string;
  password?: string;
  role?: CompanyRole;
}

export interface PaginatedResult {
  data: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type BasicAttendanceStatus = 'present' | 'no_records' | 'incomplete';
export type MonthlySummaryStatus =
  | BasicAttendanceStatus
  | 'calculated'
  | 'absent'
  | 'holiday'
  | 'weekend'
  | 'needs_review'
  | 'justified';
export type IncompleteReason =
  | 'single_punch'
  | 'odd_punch_count'
  | 'missing_exit'
  | 'missing_entry_unknown';

export interface ReportEmployeeSummary {
  id: string;
  nombre: string;
  apellido: string;
  companyId: string | null;
}

export interface DailyPresenceReportRow {
  employee: ReportEmployeeSummary;
  userId: string;
  date: string;
  firstPunch: string | null;
  lastPunch: string | null;
  punchCount: number;
  workedMinutes: number;
  primaryDevice: string | null;
  devices: string[];
  status: BasicAttendanceStatus;
}

export interface IncompleteRecordsReportRow {
  employee: ReportEmployeeSummary;
  userId: string;
  date: string;
  punchCount: number;
  punchTimes: string[];
  devices: string[];
  reason: IncompleteReason;
}

export interface MonthlySummaryDay {
  day: number;
  date: string;
  firstPunch: string | null;
  lastPunch: string | null;
  firstPunchAt?: string | null;
  lastPunchAt?: string | null;
  punchCount: number;
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  isAbsent: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  hasIncompleteRecord: boolean;
  justificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  status: MonthlySummaryStatus;
}

export interface MonthlySummaryReportRow {
  employee: ReportEmployeeSummary;
  userId: string;
  year: number;
  month: number;
  daysWithRecords: number;
  presentDays: number;
  absentDays: number;
  holidayDays: number;
  weekendDays: number;
  totalPunches: number;
  totalWorkedMinutes: number;
  totalWorkedHours: number;
  totalLateMinutes: number;
  totalEarlyDepartureMinutes: number;
  totalOvertimeMinutes: number;
  incompleteDays: number;
  days: MonthlySummaryDay[];
}

export interface MonthlySummaryReport {
  source: 'summaries' | 'raw_records';
  coverage: {
    expectedSummaryDays: number;
    calculatedSummaryDays: number;
    missingSummaryDays: number;
    isPartial: boolean;
  };
  rows: MonthlySummaryReportRow[];
}

export interface ReportFilterParams {
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  userId?: string;
  deviceId?: string;
  companyId?: string;
}

export interface MonthlySummaryParams {
  year: number | string;
  month: number | string;
  employeeId?: string;
  userId?: string;
  companyId?: string;
}

export interface AttendanceDaySummary {
  id: string;
  companyId: string;
  employeeId: string;
  employee: EmployeeSummary | null;
  date: string;
  firstPunchAt: string | null;
  lastPunchAt: string | null;
  totalPunchCount: number;
  punchTimesJson: string[] | null;
  deviceIdsJson: number[] | null;
  primaryDeviceId: number | null;
  primaryDeviceSn: string | null;
  primaryDeviceName: string | null;
  isPresent: boolean;
  hasRecords: boolean;
  hasIncompleteRecord: boolean;
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  isAbsent: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  status: 'no_records' | 'present' | 'incomplete' | 'calculated' | 'absent' | 'holiday' | 'weekend' | 'needs_review' | 'justified';
  justificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  justificationRequestId: string | null;
  notes: string | null;
  calculatedAt: string | null;
}

export type AttendanceRequestType = 'manual_punch' | 'punch_correction' | 'absence_justification' | 'late_justification';
export type AttendanceRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AttendancePunchType = 'in' | 'out' | 'unknown';

export interface AttendanceRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employee: EmployeeSummary | null;
  requestedByUserId: number;
  reviewedByUserId: number | null;
  type: AttendanceRequestType;
  status: AttendanceRequestStatus;
  date: string;
  punchTime: string | null;
  punchType: AttendancePunchType | null;
  targetAttendanceRecordId: number | null;
  oldPunchTime: string | null;
  newPunchTime: string | null;
  reason: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRequestInput {
  companyId?: string;
  employeeId: string;
  type: AttendanceRequestType;
  date: string;
  punchTime?: string;
  punchType?: AttendancePunchType;
  targetAttendanceRecordId?: number;
  newPunchTime?: string;
  reason: string;
  autoApprove?: boolean;
}

export interface AttendanceRequestsParams {
  status?: AttendanceRequestStatus;
  type?: AttendanceRequestType;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  companyId?: string;
}

export interface AttendanceAuditLog {
  id: string;
  companyId: string;
  employeeId: string | null;
  employee: EmployeeSummary | null;
  attendanceRecordId: number | null;
  attendanceRequestId: string | null;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  performedByUserId: number;
  createdAt: string;
}

export interface Holiday {
  id: string;
  companyId: string | null;
  date: string;
  name: string;
  type: 'national' | 'company' | 'regional';
  isWorkable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayInput {
  date: string;
  name: string;
  type?: 'national' | 'company' | 'regional';
  isWorkable?: boolean;
  companyId?: string | null;
}

export interface AttendanceSummaryParams {
  dateFrom: string;
  dateTo: string;
  employeeId?: string;
  companyId?: string;
}

export interface RecalculateAttendanceResult {
  employeesProcessed: number;
  daysProcessed: number;
  summariesCreated: number;
  summariesUpdated: number;
  dateFrom: string;
  dateTo: string;
  absentDays: number;
  incompleteDays: number;
  lateDays: number;
  earlyDepartureDays: number;
  holidayDays: number;
  weekendDays: number;
}

export interface Phase2ReportRow {
  employee: EmployeeSummary | null;
  employeeId: string;
  date: string;
  firstPunchAt: string | null;
  lastPunchAt: string | null;
  expectedEntryTime: string | null;
  expectedExitTime: string | null;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  workedMinutes: number;
  expectedMinutes: number;
  overtimeMinutes: number;
  status: string;
  reason?: string;
}

export const VERIFY_LABELS: Record<number, string> = {
  0: 'Contraseña',
  1: 'Huella',
  2: 'Tarjeta badge',
  4: 'Tarjeta RFID',
  5: 'Huella o contraseña',
  6: 'Huella o tarjeta',
  8: 'Tarjeta y huella',
  9: 'Huella y contraseña',
  15: 'Rostro',
  16: 'Rostro y huella',
  17: 'Rostro y contraseña',
  21: 'Vena de dedo',
  25: 'Palmilla',
  101: 'GPS',
  102: 'AI Camera',
  200: 'Otro',
};

export function getStats() {
  return apiFetch<Stats>('/attendance/stats');
}

export function getAttendanceDashboard() {
  return apiFetch<DashboardSummary>('/attendance/dashboard');
}

export const getDashboardSummary = getAttendanceDashboard;

export function getAdminDashboard() {
  return apiFetch<AdminDashboardSummary>('/admin/dashboard');
}

export function getRecent() {
  return apiFetch<AttendanceRecord[]>('/attendance/recent');
}

export function getDevices() {
  return apiFetch<Device[]>('/devices');
}

export function getAdminCompanies() {
  return apiFetch<CompanySummary[]>('/admin/companies');
}

export function createAdminCompany(input: CompanyInput) {
  return apiFetch<CompanySummary>('/admin/companies', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminCompany(id: string, input: CompanyUpdateInput) {
  return apiFetch<CompanySummary>(`/admin/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteAdminCompany(id: string) {
  return apiFetch<{ success: true }>(`/admin/companies/${id}`, {
    method: 'DELETE',
  });
}

export function getAdminCompanyEmployees(companyId: string) {
  return apiFetch<Employee[]>(`/admin/companies/${companyId}/employees`);
}

export function getAdminCompanyEligibleEmployees(companyId: string) {
  return apiFetch<Employee[]>(`/admin/companies/${companyId}/eligible-employees`);
}

export function assignAdminCompanyEmployee(companyId: string, employeeId: string) {
  return apiFetch<void>(`/admin/companies/${companyId}/employees/${employeeId}`, {
    method: 'PUT',
  });
}

export function removeAdminCompanyEmployee(companyId: string, employeeId: string) {
  return apiFetch<void>(`/admin/companies/${companyId}/employees/${employeeId}`, {
    method: 'DELETE',
  });
}

export function getAdminCompanyUsers(companyId: string) {
  return apiFetch<CompanyUser[]>(`/admin/companies/${companyId}/users`);
}

export function createAdminCompanyUser(companyId: string, input: CompanyUserInput) {
  return apiFetch<CompanyUser>(`/admin/companies/${companyId}/users`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminCompanyUser(companyId: string, userId: number, input: CompanyUserUpdateInput) {
  return apiFetch<CompanyUser>(`/admin/companies/${companyId}/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function removeAdminCompanyUser(companyId: string, userId: number) {
  return apiFetch<void>(`/admin/companies/${companyId}/users/${userId}`, {
    method: 'DELETE',
  });
}

export function getAdminDevices() {
  return apiFetch<AdminDevice[]>('/admin/devices');
}

export function getAdminUnassignedDevices() {
  return apiFetch<AdminDevice[]>('/admin/devices/unassigned');
}

export function assignAdminDeviceCompany(
  deviceId: number,
  input: AssignAdminDeviceCompanyInput,
) {
  return apiFetch<AdminDevice>(`/admin/devices/${deviceId}/company`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function unassignAdminDeviceCompany(deviceId: number) {
  return apiFetch<AdminDevice>(`/admin/devices/${deviceId}/company`, {
    method: 'DELETE',
  });
}

export function sendAdminDeviceCommand(deviceId: number, commandType: string) {
  return apiFetch<{ command: { id: number; status: string }; device: unknown }>(
    `/admin/devices/${deviceId}/command`,
    {
      method: 'POST',
      body: JSON.stringify({ commandType }),
    },
  );
}

export function requestDeviceForceSync(deviceId: number) {
  return apiFetch<DeviceForceSyncResult>(`/devices/${deviceId}/force-sync`, {
    method: 'POST',
  });
}

export function getCompanyUsers() {
  return apiFetch<CompanyUser[]>('/company/users');
}

export function getCompanySettings() {
  return apiFetch<CompanySummary>('/company/settings');
}

export function updateCompanySettings(input: CompanySettingsInput) {
  return apiFetch<CompanySummary>('/company/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function getScheduleProfiles() {
  return apiFetch<ScheduleProfile[]>('/company/schedule-profiles');
}

export function createScheduleProfile(input: ScheduleProfileInput) {
  return apiFetch<ScheduleProfile>('/company/schedule-profiles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateScheduleProfile(id: string, input: Partial<ScheduleProfileInput>) {
  return apiFetch<ScheduleProfile>(`/company/schedule-profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteScheduleProfile(id: string) {
  return apiFetch<{ success: true }>(`/company/schedule-profiles/${id}`, {
    method: 'DELETE',
  });
}

export function getCompanyEligibleEmployees() {
  return apiFetch<Employee[]>('/company/eligible-employees');
}

export function createCompanyUser(input: CompanyUserInput) {
  return apiFetch<CompanyUser>('/company/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCompanyUser(userId: number, input: CompanyUserUpdateInput) {
  return apiFetch<CompanyUser>(`/company/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteCompanyUser(userId: number) {
  return apiFetch<{ success: true }>(`/company/users/${userId}`, {
    method: 'DELETE',
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

function buildReportQuery(params: object) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as Array<[string, string | number | undefined]>) {
    if (value !== undefined && value !== '') {
      qs.set(key, String(value));
    }
  }
  const search = qs.toString();
  return search ? `?${search}` : '';
}

export function getDailyPresenceReport(params: ReportFilterParams = {}) {
  return apiFetch<DailyPresenceReportRow[]>(`/reports/daily-presence${buildReportQuery(params)}`);
}

export function exportDailyPresenceReport(params: ReportFilterParams = {}) {
  return `/api/reports/export${buildReportQuery({ ...params, report: 'daily-presence' })}`;
}

export function getIncompleteRecordsReport(params: ReportFilterParams = {}) {
  return apiFetch<IncompleteRecordsReportRow[]>(`/reports/incomplete-records${buildReportQuery(params)}`);
}

export function exportIncompleteRecordsReport(params: ReportFilterParams = {}) {
  return `/api/reports/export${buildReportQuery({ ...params, report: 'incomplete-records' })}`;
}

export function getMonthlySummaryReport(params: MonthlySummaryParams) {
  return apiFetch<MonthlySummaryReport>(`/reports/monthly-summary${buildReportQuery(params)}`);
}

export function exportMonthlySummaryReport(params: MonthlySummaryParams) {
  return `/api/reports/export${buildReportQuery({ ...params, report: 'monthly-summary' })}`;
}

export function getAttendanceDaySummaries(params: AttendanceSummaryParams) {
  return apiFetch<AttendanceDaySummary[]>(`/attendance/day-summaries${buildReportQuery(params)}`);
}

export function recalculateAttendanceSummaries(params: AttendanceSummaryParams) {
  return apiFetch<RecalculateAttendanceResult>('/attendance/recalculate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function getAttendanceRequests(params: AttendanceRequestsParams = {}) {
  return apiFetch<AttendanceRequest[]>(`/attendance/requests${buildReportQuery(params)}`);
}

export function createAttendanceRequest(input: AttendanceRequestInput) {
  return apiFetch<AttendanceRequest>('/attendance/requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function approveAttendanceRequest(id: string, reviewNotes?: string) {
  return apiFetch<AttendanceRequest>(`/attendance/requests/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ reviewNotes }),
  });
}

export function rejectAttendanceRequest(id: string, reviewNotes: string) {
  return apiFetch<AttendanceRequest>(`/attendance/requests/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reviewNotes }),
  });
}

export function cancelAttendanceRequest(id: string) {
  return apiFetch<AttendanceRequest>(`/attendance/requests/${id}/cancel`, {
    method: 'PUT',
  });
}

export function getAttendanceAuditLog(params: AttendanceRequestsParams & { action?: string; requestId?: string } = {}) {
  return apiFetch<AttendanceAuditLog[]>(`/attendance/audit-log${buildReportQuery(params)}`);
}

export function getLateArrivalsReport(params: ReportFilterParams & { minLateMinutes?: string } = {}) {
  return apiFetch<Phase2ReportRow[]>(`/reports/late-arrivals${buildReportQuery(params)}`);
}

export function exportLateArrivalsReport(params: ReportFilterParams & { minLateMinutes?: string } = {}) {
  return `/api/reports/export${buildReportQuery({ ...params, report: 'late-arrivals' })}`;
}

export function getEarlyDeparturesReport(params: ReportFilterParams = {}) {
  return apiFetch<Phase2ReportRow[]>(`/reports/early-departures${buildReportQuery(params)}`);
}

export function exportEarlyDeparturesReport(params: ReportFilterParams = {}) {
  return `/api/reports/export${buildReportQuery({ ...params, report: 'early-departures' })}`;
}

export function getAbsencesReport(params: ReportFilterParams = {}) {
  return apiFetch<Phase2ReportRow[]>(`/reports/absences${buildReportQuery(params)}`);
}

export function exportAbsencesReport(params: ReportFilterParams = {}) {
  return `/api/reports/export${buildReportQuery({ ...params, report: 'absences' })}`;
}

export function getWorkedHoursReport(params: ReportFilterParams = {}) {
  return apiFetch<Phase2ReportRow[]>(`/reports/worked-hours${buildReportQuery(params)}`);
}

export function exportWorkedHoursReport(params: ReportFilterParams = {}) {
  return `/api/reports/export${buildReportQuery({ ...params, report: 'worked-hours' })}`;
}

export function getHolidays(params: { year?: string | number; month?: string | number; companyId?: string } = {}) {
  return apiFetch<Holiday[]>(`/holidays${buildReportQuery(params)}`);
}

export function createHoliday(input: HolidayInput) {
  return apiFetch<Holiday>('/holidays', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateHoliday(id: string, input: Partial<HolidayInput>) {
  return apiFetch<Holiday>(`/holidays/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteHoliday(id: string) {
  return apiFetch<{ success: true }>(`/holidays/${id}`, {
    method: 'DELETE',
  });
}
