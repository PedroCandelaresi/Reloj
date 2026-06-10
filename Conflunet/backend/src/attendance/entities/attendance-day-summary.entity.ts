import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type AttendanceDaySummaryStatus =
  | 'no_records'
  | 'present'
  | 'incomplete'
  | 'calculated'
  | 'absent'
  | 'holiday'
  | 'weekend'
  | 'needs_review'
  | 'justified';

export type AttendanceJustificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

@Entity('attendance_day_summaries')
@Unique('UQ_attendance_day_summaries_company_employee_date', ['companyId', 'employeeId', 'date'])
@Index('IDX_attendance_day_summaries_company_date', ['companyId', 'date'])
@Index('IDX_attendance_day_summaries_company_employee_date', ['companyId', 'employeeId', 'date'])
@Index('IDX_attendance_day_summaries_date', ['date'])
export class AttendanceDaySummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'first_punch_at', type: 'timestamp', nullable: true })
  firstPunchAt: Date | null;

  @Column({ name: 'last_punch_at', type: 'timestamp', nullable: true })
  lastPunchAt: Date | null;

  @Column({ name: 'total_punch_count', default: 0 })
  totalPunchCount: number;

  @Column({ name: 'punch_times_json', type: 'jsonb', nullable: true })
  punchTimesJson: string[] | null;

  @Column({ name: 'device_ids_json', type: 'jsonb', nullable: true })
  deviceIdsJson: number[] | null;

  @Column({ name: 'primary_device_id', nullable: true })
  primaryDeviceId: number | null;

  @Column({ name: 'primary_device_sn', nullable: true })
  primaryDeviceSn: string | null;

  @Column({ name: 'primary_device_name', nullable: true })
  primaryDeviceName: string | null;

  @Column({ name: 'is_present', default: false })
  isPresent: boolean;

  @Column({ name: 'has_records', default: false })
  hasRecords: boolean;

  @Column({ name: 'has_incomplete_record', default: false })
  hasIncompleteRecord: boolean;

  @Column({ name: 'worked_minutes', default: 0 })
  workedMinutes: number;

  @Column({ name: 'expected_minutes', default: 0 })
  expectedMinutes: number;

  @Column({ name: 'late_minutes', default: 0 })
  lateMinutes: number;

  @Column({ name: 'early_departure_minutes', default: 0 })
  earlyDepartureMinutes: number;

  @Column({ name: 'overtime_minutes', default: 0 })
  overtimeMinutes: number;

  @Column({ name: 'is_absent', default: false })
  isAbsent: boolean;

  @Column({ name: 'is_holiday', default: false })
  isHoliday: boolean;

  @Column({ name: 'is_weekend', default: false })
  isWeekend: boolean;

  @Column({ default: 'no_records' })
  status: AttendanceDaySummaryStatus;

  @Column({ name: 'justification_status', default: 'none' })
  justificationStatus: AttendanceJustificationStatus;

  @Column({ name: 'justification_request_id', type: 'uuid', nullable: true })
  justificationRequestId: string | null;

  @Column({ nullable: true })
  notes: string | null;

  @Column({ name: 'calculated_at', type: 'timestamp', nullable: true })
  calculatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
