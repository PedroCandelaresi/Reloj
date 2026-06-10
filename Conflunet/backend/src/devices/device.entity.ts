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

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'serial_number', unique: true })
  serialNumber: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Index('IDX_devices_company_id')
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @Column({ nullable: true, length: 150 })
  alias: string | null;

  @Column({ length: 300, nullable: true })
  address: string | null;

  @Column({ length: 200, nullable: true })
  email: string | null;

  @Column({ length: 50, nullable: true })
  phone: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  @CreateDateColumn({ name: 'first_seen' })
  firstSeen: Date;

  @UpdateDateColumn({ name: 'last_seen' })
  lastSeen: Date;
}
