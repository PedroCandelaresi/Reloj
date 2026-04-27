import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AdminUser } from '../users/admin-user.entity';
import { Company } from './company.entity';
import { CompanyRole } from './company-role.enum';

@Entity('company_memberships')
@Unique('UQ_company_memberships_company_user', ['companyId', 'adminUserId'])
export class CompanyMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_company_memberships_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Index('IDX_company_memberships_admin_user_id')
  @Column({ name: 'admin_user_id', type: 'integer' })
  adminUserId: number;

  @Column({ type: 'varchar', length: 30 })
  role: CompanyRole;

  @ManyToOne(() => Company, (company) => company.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @ManyToOne(() => AdminUser, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_user_id' })
  user?: AdminUser;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
