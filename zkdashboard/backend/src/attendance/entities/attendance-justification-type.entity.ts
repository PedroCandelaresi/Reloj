import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type AttendanceJustificationAppliesTo =
  | 'absence'
  | 'late'
  | 'early_departure'
  | 'manual_punch'
  | 'punch_correction'
  | 'general';

@Entity('attendance_justification_types')
@Index('IDX_attendance_justification_types_company_active', ['companyId', 'isActive'])
@Index('IDX_attendance_justification_types_applies_to', ['appliesTo'])
export class AttendanceJustificationType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'applies_to' })
  appliesTo: AttendanceJustificationAppliesTo;

  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  @Column({ name: 'requires_attachment', default: false })
  requiresAttachment: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
