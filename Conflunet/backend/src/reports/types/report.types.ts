import { Employee } from '../../employees/employee.entity';

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
  firstPunchAt?: Date | null;
  lastPunchAt?: Date | null;
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
  justificationTypeName?: string | null;
  attachmentCount?: number;
  status: MonthlySummaryStatus;
}

export interface MonthlySummaryRow {
  employee: ReportEmployeeSummary;
  userId: string;
  year: number;
  month: number;
  workDaysCount?: number;
  presentDaysCount?: number;
  absentDaysCount?: number;
  justifiedAbsentDaysCount?: number;
  attendancePercentage?: number | null;
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

export interface MonthlySummaryCoverage {
  expectedSummaryDays: number;
  calculatedSummaryDays: number;
  missingSummaryDays: number;
  isPartial: boolean;
}

export interface MonthlySummaryReport {
  source: 'summaries' | 'raw_records';
  coverage: MonthlySummaryCoverage;
  rows: MonthlySummaryRow[];
}

export function toReportEmployee(employee: Employee): ReportEmployeeSummary {
  return {
    id: employee.id,
    nombre: employee.nombre,
    apellido: employee.apellido,
    companyId: employee.companyId,
  };
}
