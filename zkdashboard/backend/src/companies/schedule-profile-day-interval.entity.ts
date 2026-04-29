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
import { ScheduleProfileDayRule } from './schedule-profile-day-rule.entity';

@Entity('schedule_profile_day_intervals')
@Index('IDX_schedule_profile_day_intervals_rule_id', ['dayRuleId'])
@Index('UQ_schedule_profile_day_interval_sequence', ['dayRuleId', 'sequence'], { unique: true })
export class ScheduleProfileDayInterval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'day_rule_id', type: 'uuid' })
  dayRuleId: string;

  @ManyToOne(() => ScheduleProfileDayRule, (rule) => rule.intervals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'day_rule_id' })
  dayRule: ScheduleProfileDayRule;

  @Column({ type: 'integer' })
  sequence: number;

  @Column({ name: 'entry_time', type: 'varchar', length: 5 })
  entryTime: string;

  @Column({ name: 'exit_time', type: 'varchar', length: 5 })
  exitTime: string;

  @Column({ name: 'crosses_midnight', type: 'boolean', default: false })
  crossesMidnight: boolean;

  @Column({ name: 'expected_minutes', type: 'integer', nullable: true })
  expectedMinutes: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
