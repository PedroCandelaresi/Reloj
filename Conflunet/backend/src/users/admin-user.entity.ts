import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../employees/employee.entity';
import { CompanyMembership } from '../companies/company-membership.entity';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  nombre: string | null;

  @Column({ nullable: true })
  apellido: string | null;

  @Column({ nullable: true })
  dni: string | null;

  @Column({ nullable: true })
  telefono: string | null;

  @Column({ nullable: true })
  email: string | null;

  @Column({ name: 'is_super_admin', default: false })
  isSuperAdmin: boolean;

  @Index('UQ_admin_users_employee_id', { unique: true })
  @Column({ name: 'employee_id', nullable: true })
  employeeId: string | null;

  @OneToOne(() => Employee, (employee) => employee.userAccount, { nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee?: Employee | null;

  @OneToMany(() => CompanyMembership, (membership) => membership.user)
  memberships?: CompanyMembership[];

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
