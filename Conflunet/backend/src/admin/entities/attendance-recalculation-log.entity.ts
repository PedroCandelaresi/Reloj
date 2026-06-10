import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AttendanceRecalculationStatus = 'running' | 'completed' | 'failed';

@Entity('attendance_recalculation_logs')
@Index('IDX_recalc_logs_company_id', ['companyId'])
@Index('IDX_recalc_logs_company_requested', ['companyId', 'requestedByUserId'])
@Index('IDX_recalc_logs_status', ['status'])
@Index('IDX_recalc_logs_created_at', ['createdAt'])
export class AttendanceRecalculationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'requested_by_user_id', type: 'integer' })
  requestedByUserId: number;

  @Column({ name: 'date_from', type: 'varchar', length: 10 })
  dateFrom: string;

  @Column({ name: 'date_to', type: 'varchar', length: 10 })
  dateTo: string;

  @Column({ name: 'employee_id', nullable: true })
  employeeId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'running' })
  status: AttendanceRecalculationStatus;

  @Column({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'finished_at', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'processed_employees', type: 'integer', nullable: true })
  processedEmployees: number | null;

  @Column({ name: 'processed_days', type: 'integer', nullable: true })
  processedDays: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
