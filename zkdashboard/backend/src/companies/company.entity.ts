import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../employees/employee.entity';
import { CompanyMembership } from './company-membership.entity';
import { ScheduleProfile } from './schedule-profile.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('UQ_companies_cuit', { unique: true })
  @Column({ length: 11 })
  cuit: string;

  @Column({ name: 'razon_social', length: 200 })
  razonSocial: string;

  @Column({ name: 'nombre_fantasia', length: 200, nullable: true })
  nombreFantasia: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'default_entry_time', type: 'varchar', length: 5, nullable: true })
  defaultEntryTime: string | null;

  @Column({ name: 'default_exit_time', type: 'varchar', length: 5, nullable: true })
  defaultExitTime: string | null;

  @OneToMany(() => Employee, (employee) => employee.company)
  employees?: Employee[];

  @OneToMany(() => CompanyMembership, (membership) => membership.company)
  memberships?: CompanyMembership[];

  @OneToMany(() => ScheduleProfile, (profile) => profile.company)
  scheduleProfiles?: ScheduleProfile[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
