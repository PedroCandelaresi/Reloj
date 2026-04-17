import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Device } from './device.entity';

export const DEVICE_COMMAND_TYPES = {
  ATTENDANCE_SYNC: 'attendance_sync',
} as const;

export type DeviceCommandType =
  (typeof DEVICE_COMMAND_TYPES)[keyof typeof DEVICE_COMMAND_TYPES];

export const DEVICE_COMMAND_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  ACKNOWLEDGED: 'acknowledged',
  FAILED: 'failed',
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

  @Column({ length: 30, default: DEVICE_COMMAND_STATUSES.PENDING })
  status: DeviceCommandStatus;

  @Column({ name: 'requested_by', nullable: true, length: 120 })
  requestedBy: string | null;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'response_payload', type: 'text', nullable: true })
  responsePayload: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;
}
