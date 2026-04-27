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

  @OneToMany(() => Employee, (employee) => employee.company)
  employees?: Employee[];

  @OneToMany(() => CompanyMembership, (membership) => membership.company)
  memberships?: CompanyMembership[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
