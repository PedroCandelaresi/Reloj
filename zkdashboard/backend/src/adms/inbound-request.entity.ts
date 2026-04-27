import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { Device } from '../devices/device.entity';

@Entity('inbound_requests')
export class InboundRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Index('IDX_inbound_requests_device_id')
  @Column({ name: 'device_id', nullable: true })
  deviceId: number | null;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id' })
  device?: Device | null;

  @Index('IDX_inbound_requests_serial_number')
  @Column({ name: 'serial_number', nullable: true, length: 120 })
  serialNumber: string | null;

  @Index('IDX_inbound_requests_company_id')
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @Column({ name: 'source_ip', type: 'varchar', length: 64, nullable: true })
  sourceIp: string | null;

  @Column({ length: 10 })
  method: string;

  @Column({ length: 200 })
  path: string;

  @Column({ name: 'query_raw', type: 'text', nullable: true })
  queryRaw: string | null;

  @Column({ name: 'body_raw', type: 'text', nullable: true })
  bodyRaw: string | null;

  @Column({ name: 'response_status', type: 'integer', nullable: true })
  responseStatus: number | null;

  @Column({ name: 'processed_ok', type: 'boolean', nullable: true })
  processedOk: boolean | null;

  @Column({ name: 'parse_error', type: 'text', nullable: true })
  parseError: string | null;

  @Index('IDX_inbound_requests_received_at')
  @CreateDateColumn({ name: 'received_at' })
  receivedAt: Date;
}
