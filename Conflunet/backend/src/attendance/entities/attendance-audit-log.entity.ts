import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AttendanceAuditAction =
  | 'manual_punch_created'
  | 'punch_corrected'
  | 'absence_justified'
  | 'late_justified'
  | 'request_created'
  | 'request_approved'
  | 'request_rejected'
  | 'request_cancelled';

@Entity('attendance_audit_logs')
@Index('IDX_attendance_audit_logs_company_created', ['companyId', 'createdAt'])
@Index('IDX_attendance_audit_logs_company_employee', ['companyId', 'employeeId'])
@Index('IDX_attendance_audit_logs_company_action', ['companyId', 'action'])
@Index('IDX_attendance_audit_logs_request', ['attendanceRequestId'])
export class AttendanceAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'employee_id', nullable: true })
  employeeId: string | null;

  @Column({ name: 'attendance_record_id', nullable: true })
  attendanceRecordId: number | null;

  @Column({ name: 'attendance_request_id', type: 'uuid', nullable: true })
  attendanceRequestId: string | null;

  @Column()
  action: AttendanceAuditAction;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, unknown> | null;

  @Column({ name: 'performed_by_user_id' })
  performedByUserId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
