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
import { AdminUser } from '../users/admin-user.entity';

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

  @Index('IDX_employees_company_id')
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, (company) => company.employees, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @OneToOne(() => AdminUser, (user) => user.employee)
  userAccount?: AdminUser | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
