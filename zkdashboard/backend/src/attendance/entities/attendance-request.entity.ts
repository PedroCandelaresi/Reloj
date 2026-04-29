import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AttendanceRequestType =
  | 'manual_punch'
  | 'punch_correction'
  | 'absence_justification'
  | 'late_justification';

export type AttendanceRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AttendancePunchType = 'in' | 'out' | 'unknown';

@Entity('attendance_requests')
@Index('IDX_attendance_requests_company_date', ['companyId', 'date'])
@Index('IDX_attendance_requests_company_status', ['companyId', 'status'])
@Index('IDX_attendance_requests_company_type', ['companyId', 'type'])
@Index('IDX_attendance_requests_company_employee', ['companyId', 'employeeId'])
export class AttendanceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @Column({ name: 'requested_by_user_id' })
  requestedByUserId: number;

  @Column({ name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId: number | null;

  @Column()
  type: AttendanceRequestType;

  @Column({ name: 'justification_type_id', type: 'uuid', nullable: true })
  justificationTypeId: string | null;

  @Column({ default: 'pending' })
  status: AttendanceRequestStatus;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'punch_time', type: 'timestamp', nullable: true })
  punchTime: Date | null;

  @Column({ name: 'punch_type', nullable: true })
  punchType: AttendancePunchType | null;

  @Column({ name: 'target_attendance_record_id', nullable: true })
  targetAttendanceRecordId: number | null;

  @Column({ name: 'old_punch_time', type: 'timestamp', nullable: true })
  oldPunchTime: Date | null;

  @Column({ name: 'new_punch_time', type: 'timestamp', nullable: true })
  newPunchTime: Date | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
