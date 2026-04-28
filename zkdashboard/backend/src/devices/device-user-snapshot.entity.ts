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
import { Company } from '../companies/company.entity';
import { Employee } from '../employees/employee.entity';
import { Device } from './device.entity';

export const DEVICE_USER_MATCH_STATUSES = {
  MATCHED: 'matched',
  SYSTEM_ONLY: 'system_only',
  DEVICE_ONLY: 'device_only',
  NAME_MISMATCH: 'name_mismatch',
  PIN_CONFLICT: 'pin_conflict',
} as const;

export type DeviceUserMatchStatus =
  (typeof DEVICE_USER_MATCH_STATUSES)[keyof typeof DEVICE_USER_MATCH_STATUSES];

@Entity('device_user_snapshots')
@Index('idx_device_user_snapshots_device_pin', ['deviceId', 'pin'], { unique: true })
@Index('idx_device_user_snapshots_company_status', ['companyId', 'matchStatus'])
@Index('idx_device_user_snapshots_device_status', ['deviceId', 'matchStatus'])
export class DeviceUserSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'device_id' })
  deviceId: number;

  @ManyToOne(() => Device, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ length: 80 })
  pin: string;

  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ nullable: true, length: 50 })
  privilege: string | null;

  @Column({ nullable: true, length: 120 })
  card: string | null;

  @Column({ name: 'password_present', type: 'boolean', nullable: true })
  passwordPresent: boolean | null;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, string> | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @Column({ name: 'matched_employee_id', nullable: true })
  matchedEmployeeId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matched_employee_id' })
  matchedEmployee?: Employee | null;

  @Column({
    name: 'match_status',
    type: 'varchar',
    length: 30,
    default: DEVICE_USER_MATCH_STATUSES.DEVICE_ONLY,
  })
  matchStatus: DeviceUserMatchStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
