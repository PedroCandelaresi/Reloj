import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { Employee } from '../employees/employee.entity';

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_sn' })
  @Index()
  deviceSn: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  // 0=Entrada, 1=Salida, 2=Descanso Sal, 3=Descanso Ent, 4=Extra Ent, 5=Extra Sal
  @Column()
  status: number;

  // 0=Contraseña, 1=Huella, 4=Rostro, 15=Tarjeta
  @Column({ name: 'verify_type' })
  verifyType: number;

  @Column({ name: 'work_code', nullable: true })
  workCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  employee?: Employee | null;
}
