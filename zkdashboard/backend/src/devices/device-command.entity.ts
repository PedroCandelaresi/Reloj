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
import { Device } from './device.entity';

export const DEVICE_COMMAND_TYPES = {
  ATTENDANCE_SYNC: 'attendance_sync',
  SET_TIME:        'set_time',
  REBOOT:          'reboot',
  CHECK:           'check',
  QUERY_ATTLOG:    'query_attlog',
  CLEAR_ATTLOG:    'clear_attlog',
  QUERY_USERINFO:  'query_userinfo',
  QUERY_BIOMETRICS:'query_biometrics',
  UPDATE_USERINFO: 'update_userinfo',
  CUSTOM:          'custom',
} as const;

export type DeviceCommandType =
  (typeof DEVICE_COMMAND_TYPES)[keyof typeof DEVICE_COMMAND_TYPES];

export const DEVICE_COMMAND_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  ACKNOWLEDGED: 'acknowledged',
  FAILED: 'failed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type DeviceCommandStatus =
  (typeof DEVICE_COMMAND_STATUSES)[keyof typeof DEVICE_COMMAND_STATUSES];

@Entity('device_commands')
@Index('idx_device_commands_device_status', ['deviceId', 'status'])
export class DeviceCommand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_id' })
  deviceId: number;

  @ManyToOne(() => Device, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'command_type', length: 50 })
  commandType: DeviceCommandType;

  @Column({ type: 'text' })
  command: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Index('IDX_device_commands_company_id')
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @Column({ length: 30, default: DEVICE_COMMAND_STATUSES.PENDING })
  status: DeviceCommandStatus;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', default: 5 })
  maxAttempts: number;

  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt: Date | null;

  @Column({ name: 'requested_by', nullable: true, length: 120 })
  requestedBy: string | null;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'result_code', nullable: true, length: 50 })
  resultCode: string | null;

  @Column({ name: 'result_raw', type: 'text', nullable: true })
  resultRaw: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: number | null;

  @Column({ name: 'response_payload', type: 'text', nullable: true })
  responsePayload: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
