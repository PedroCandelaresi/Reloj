import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../employees/employee.entity';
import { Company } from './company.entity';
import { ScheduleProfileDayRule } from './schedule-profile-day-rule.entity';

export type ScheduleProfileRotationMode = 'none' | 'weekly' | 'daily_cycle';
export type ScheduleProfileTimeBankMode = 'none' | 'overtime_only' | 'overtime_and_deficit';

@Entity('schedule_profiles')
@Index('UQ_schedule_profiles_company_name', ['companyId', 'name'], { unique: true })
export class ScheduleProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_schedule_profiles_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.scheduleProfiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'entry_time', type: 'varchar', length: 5 })
  entryTime: string;

  @Column({ name: 'exit_time', type: 'varchar', length: 5 })
  exitTime: string;

  @Column({ name: 'summer_entry_time', type: 'varchar', length: 5, nullable: true })
  summerEntryTime: string | null;

  @Column({ name: 'summer_exit_time', type: 'varchar', length: 5, nullable: true })
  summerExitTime: string | null;

  @Column({ name: 'summer_start', type: 'varchar', length: 5, nullable: true })
  summerStart: string | null;

  @Column({ name: 'summer_end', type: 'varchar', length: 5, nullable: true })
  summerEnd: string | null;

  @Column({ name: 'winter_entry_time', type: 'varchar', length: 5, nullable: true })
  winterEntryTime: string | null;

  @Column({ name: 'winter_exit_time', type: 'varchar', length: 5, nullable: true })
  winterExitTime: string | null;

  @Column({ name: 'winter_start', type: 'varchar', length: 5, nullable: true })
  winterStart: string | null;

  @Column({ name: 'winter_end', type: 'varchar', length: 5, nullable: true })
  winterEnd: string | null;

  @Column({ name: 'late_tolerance_minutes', default: 0 })
  lateToleranceMinutes: number;

  @Column({ name: 'early_departure_tolerance_minutes', default: 0 })
  earlyDepartureToleranceMinutes: number;

  @Column({ name: 'expected_minutes_per_day', nullable: true })
  expectedMinutesPerDay: number | null;

  @Column({ name: 'work_days', type: 'jsonb', nullable: true })
  workDays: string[] | null;

  @Column({ name: 'break_minutes', default: 0 })
  breakMinutes: number;

  @Column({ name: 'overtime_after_minutes', default: 0 })
  overtimeAfterMinutes: number;

  @Column({ name: 'rotation_mode', type: 'varchar', length: 20, default: 'none' })
  rotationMode: ScheduleProfileRotationMode;

  @Column({ name: 'rotation_start_date', type: 'date', nullable: true })
  rotationStartDate: string | null;

  @Column({ name: 'rotation_length_weeks', type: 'integer', nullable: true })
  rotationLengthWeeks: number | null;

  @Column({ name: 'rotation_length_days', type: 'integer', nullable: true })
  rotationLengthDays: number | null;

  @Column({ name: 'time_bank_enabled', type: 'boolean', default: false })
  timeBankEnabled: boolean;

  @Column({ name: 'time_bank_mode', type: 'varchar', length: 30, default: 'none' })
  timeBankMode: ScheduleProfileTimeBankMode;

  @OneToMany(() => Employee, (employee) => employee.scheduleProfile)
  employees?: Employee[];

  @OneToMany(() => ScheduleProfileDayRule, (rule) => rule.scheduleProfile, { cascade: true })
  dayRules?: ScheduleProfileDayRule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
