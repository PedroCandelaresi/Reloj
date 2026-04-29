import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ScheduleProfile } from './schedule-profile.entity';

export type ScheduleProfileSeason = 'normal' | 'summer' | 'winter';

@Entity('schedule_profile_day_rules')
@Index('UQ_schedule_profile_day_rule', ['scheduleProfileId', 'dayOfWeek', 'season'], { unique: true })
@Index('IDX_schedule_profile_day_rules_profile_id', ['scheduleProfileId'])
export class ScheduleProfileDayRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'schedule_profile_id', type: 'uuid' })
  scheduleProfileId: string;

  @ManyToOne(() => ScheduleProfile, (profile) => profile.dayRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_profile_id' })
  scheduleProfile: ScheduleProfile;

  @Column({ name: 'day_of_week', type: 'integer' })
  dayOfWeek: number;

  @Column({ type: 'varchar', length: 12, default: 'normal' })
  season: ScheduleProfileSeason;

  @Column({ name: 'is_workday', type: 'boolean', default: true })
  isWorkday: boolean;

  @Column({ name: 'entry_time', type: 'varchar', length: 5, nullable: true })
  entryTime: string | null;

  @Column({ name: 'exit_time', type: 'varchar', length: 5, nullable: true })
  exitTime: string | null;

  @Column({ name: 'break_minutes', type: 'integer', default: 0 })
  breakMinutes: number;

  @Column({ name: 'expected_minutes', type: 'integer', nullable: true })
  expectedMinutes: number | null;

  @Column({ name: 'late_tolerance_minutes', type: 'integer', nullable: true })
  lateToleranceMinutes: number | null;

  @Column({ name: 'early_departure_tolerance_minutes', type: 'integer', nullable: true })
  earlyDepartureToleranceMinutes: number | null;

  @Column({ name: 'overtime_after_minutes', type: 'integer', nullable: true })
  overtimeAfterMinutes: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
