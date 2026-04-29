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
import { ScheduleProfileDayInterval } from './schedule-profile-day-interval.entity';
import { ScheduleProfile } from './schedule-profile.entity';

export type ScheduleProfileSeason = 'normal' | 'summer' | 'winter';

@Entity('schedule_profile_day_rules')
@Index('IDX_schedule_profile_day_rules_profile_id', ['scheduleProfileId'])
export class ScheduleProfileDayRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'schedule_profile_id', type: 'uuid' })
  scheduleProfileId: string;

  @ManyToOne(() => ScheduleProfile, (profile) => profile.dayRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_profile_id' })
  scheduleProfile: ScheduleProfile;

  @Column({ name: 'day_of_week', type: 'integer', nullable: true })
  dayOfWeek: number | null;

  @Column({ name: 'cycle_day', type: 'integer', nullable: true })
  cycleDay: number | null;

  @Column({ name: 'cycle_week', type: 'integer', nullable: true })
  cycleWeek: number | null;

  @Column({ type: 'varchar', length: 12, default: 'normal' })
  season: ScheduleProfileSeason;

  @Column({ name: 'is_workday', type: 'boolean', default: true })
  isWorkday: boolean;

  @Column({ name: 'entry_time', type: 'varchar', length: 5, nullable: true })
  entryTime: string | null;

  @Column({ name: 'exit_time', type: 'varchar', length: 5, nullable: true })
  exitTime: string | null;

  @Column({ name: 'is_split_shift', type: 'boolean', default: false })
  isSplitShift: boolean;

  @Column({ name: 'second_entry_time', type: 'varchar', length: 5, nullable: true })
  secondEntryTime: string | null;

  @Column({ name: 'second_exit_time', type: 'varchar', length: 5, nullable: true })
  secondExitTime: string | null;

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

  @OneToMany(() => ScheduleProfileDayInterval, (interval) => interval.dayRule, { cascade: true })
  intervals?: ScheduleProfileDayInterval[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
