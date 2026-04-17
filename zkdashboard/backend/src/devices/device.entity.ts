import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'serial_number', unique: true })
  serialNumber: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @UpdateDateColumn({ name: 'last_seen' })
  lastSeen: Date;
}
