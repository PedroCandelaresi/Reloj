import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { Employee } from '../employees/employee.entity';

export type AttendanceRecordSource = 'device' | 'manual' | 'correction' | 'import';

@Entity('attendance_records')
@Index('UQ_attendance_records_device_user_timestamp', ['deviceSn', 'userId', 'timestamp'], {
  unique: true,
})
@Index('IDX_attendance_records_company_timestamp', ['companyId', 'timestamp'])
@Index('IDX_attendance_records_company_user_timestamp', ['companyId', 'userId', 'timestamp'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_sn' })
  @Index()
  deviceSn: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Index('IDX_attendance_records_device_id')
  @Column({ name: 'device_id', nullable: true })
  deviceId: number | null;

  @Index('IDX_attendance_records_company_id')
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  // 0=Entrada, 1=Salida, 2=Descanso Sal, 3=Descanso Ent, 4=Extra Ent, 5=Extra Sal
  @Column()
  status: number;

  // BioTime/ZKTeco: 0=Contraseña, 1=Huella, 4=Tarjeta RFID, 15=Rostro.
  @Column({ name: 'verify_type' })
  verifyType: number;

  @Column({ name: 'work_code', nullable: true })
  workCode: string;

  @Column({ default: 'device' })
  source: AttendanceRecordSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  employee?: Employee | null;
}
