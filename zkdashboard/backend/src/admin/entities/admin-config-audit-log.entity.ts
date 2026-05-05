import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AdminConfigAuditAction =
  | 'schedule_profile_created'
  | 'schedule_profile_updated'
  | 'schedule_profile_deleted'
  | 'schedule_profile_rule_created'
  | 'schedule_profile_rule_updated'
  | 'schedule_profile_rule_deleted'
  | 'employee_schedule_profile_assigned'
  | 'employee_schedule_profile_removed'
  | 'employee_status_changed'
  | 'employee_department_changed'
  | 'employee_position_changed'
  | 'employee_created'
  | 'employee_deleted'
  | 'department_created'
  | 'department_updated'
  | 'department_deleted'
  | 'position_created'
  | 'position_updated'
  | 'position_deleted'
  | 'holiday_created'
  | 'holiday_updated'
  | 'holiday_deleted'
  | 'company_default_settings_updated';

@Entity('admin_config_audit_logs')
@Index('IDX_config_audit_company_id', ['companyId'])
@Index('IDX_config_audit_user_id', ['userId'])
@Index('IDX_config_audit_action', ['action'])
@Index('IDX_config_audit_entity', ['entityType', 'entityId'])
@Index('IDX_config_audit_company_created', ['companyId', 'createdAt'])
export class AdminConfigAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', length: 60 })
  action: AdminConfigAuditAction;

  @Column({ name: 'entity_type', type: 'varchar', length: 60 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 120 })
  entityId: string;

  @Column({ name: 'before_value', type: 'jsonb', nullable: true })
  beforeValue: Record<string, unknown> | null;

  @Column({ name: 'after_value', type: 'jsonb', nullable: true })
  afterValue: Record<string, unknown> | null;

  @Column({ name: 'change_description', type: 'text', nullable: true })
  changeDescription: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
