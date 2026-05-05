import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';
import { AdminUser } from '../users/admin-user.entity';
import { Department } from './department.entity';
import { Position } from './position.entity';

@Entity('employees')
export class Employee {
  @PrimaryColumn()
  id: string;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column({ nullable: true })
  telefono: string | null;

  @Column({ nullable: true })
  email: string | null;

  @Column({ name: 'entry_time', type: 'varchar', length: 5, nullable: true })
  entryTime: string | null;

  @Column({ name: 'exit_time', type: 'varchar', length: 5, nullable: true })
  exitTime: string | null;

  @Index('IDX_employees_schedule_profile_id')
  @Column({ name: 'schedule_profile_id', type: 'uuid', nullable: true })
  scheduleProfileId: string | null;

  @Index('IDX_employees_company_id')
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Index('IDX_employees_department_id')
  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @Index('IDX_employees_position_id')
  @Column({ name: 'position_id', type: 'uuid', nullable: true })
  positionId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'inactive_at', type: 'timestamp', nullable: true })
  inactiveAt: Date | null;

  @Column({ name: 'inactive_reason', type: 'text', nullable: true })
  inactiveReason: string | null;

  @ManyToOne(() => Company, (company) => company.employees, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @ManyToOne(() => Department, (department) => department.employees, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @ManyToOne(() => Position, (position) => position.employees, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'position_id' })
  position?: Position | null;

  @ManyToOne(() => ScheduleProfile, (profile) => profile.employees, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'schedule_profile_id' })
  scheduleProfile?: ScheduleProfile | null;

  @OneToOne(() => AdminUser, (user) => user.employee)
  userAccount?: AdminUser | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
