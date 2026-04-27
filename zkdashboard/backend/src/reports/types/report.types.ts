import { Employee } from '../../employees/employee.entity';

export type BasicAttendanceStatus = 'present' | 'no_records' | 'incomplete';
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

export interface PairingInputRecord {
  timestamp: Date;
  deviceSn: string;
  deviceId: number | null;
}

export interface PairingResult {
  firstPunch: Date | null;
  lastPunch: Date | null;
  punchCount: number;
  workedMinutes: number;
  isIncomplete: boolean;
  punchTimes: Date[];
  devices: string[];
  primaryDevice: string | null;
}

export interface DailyPresenceRow {
  employee: ReportEmployeeSummary;
  userId: string;
  date: string;
  firstPunch: Date | null;
  lastPunch: Date | null;
  punchCount: number;
  workedMinutes: number;
  primaryDevice: string | null;
  devices: string[];
  status: BasicAttendanceStatus;
}

export interface IncompleteRecordRow {
  employee: ReportEmployeeSummary;
  userId: string;
  date: string;
  punchCount: number;
  punchTimes: Date[];
  devices: string[];
  reason: IncompleteReason;
}

export interface MonthlySummaryDay {
  day: number;
  date: string;
  firstPunch: Date | null;
  lastPunch: Date | null;
  punchCount: number;
  workedMinutes: number;
  status: BasicAttendanceStatus;
}

export interface MonthlySummaryRow {
  employee: ReportEmployeeSummary;
  userId: string;
  year: number;
  month: number;
  daysWithRecords: number;
  totalPunches: number;
  totalWorkedMinutes: number;
  totalWorkedHours: number;
  incompleteDays: number;
  days: MonthlySummaryDay[];
}

export function toReportEmployee(employee: Employee): ReportEmployeeSummary {
  return {
    id: employee.id,
    nombre: employee.nombre,
    apellido: employee.apellido,
    companyId: employee.companyId,
  };
}
