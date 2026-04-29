import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttendanceDaySummary } from '../attendance/entities/attendance-day-summary.entity';
import { AdminUser } from '../users/admin-user.entity';
import { Employee } from './employee.entity';

export type EmployeeTimeBankLedgerType = 'credit' | 'debit' | 'adjustment';
export type EmployeeTimeBankLedgerSource = 'overtime' | 'deficit' | 'manual_adjustment' | 'correction';

@Entity('employee_time_bank_ledger')
@Index('IDX_employee_time_bank_ledger_company_employee_date', ['companyId', 'employeeId', 'date'])
@Index('IDX_employee_time_bank_ledger_summary_source', ['attendanceDaySummaryId', 'source'])
export class EmployeeTimeBankLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', referencedColumnName: 'id' })
  employee: Employee;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'attendance_day_summary_id', type: 'uuid', nullable: true })
  attendanceDaySummaryId: string | null;

  @ManyToOne(() => AttendanceDaySummary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attendance_day_summary_id' })
  attendanceDaySummary: AttendanceDaySummary | null;

  @Column({ type: 'varchar', length: 20 })
  type: EmployeeTimeBankLedgerType;

  @Column({ type: 'integer' })
  minutes: number;

  @Column({ type: 'varchar', length: 30 })
  source: EmployeeTimeBankLedgerSource;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'created_by_user_id', type: 'integer', nullable: true })
  createdByUserId: number | null;

  @ManyToOne(() => AdminUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: AdminUser | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
