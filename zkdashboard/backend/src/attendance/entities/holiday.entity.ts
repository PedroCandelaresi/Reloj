import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type HolidayType = 'national' | 'company' | 'regional';

@Entity('holidays')
@Index('IDX_holidays_company_date', ['companyId', 'date'])
@Index('IDX_holidays_date', ['date'])
export class Holiday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ length: 160 })
  name: string;

  @Column({ default: 'national' })
  type: HolidayType;

  @Column({ name: 'is_workable', default: false })
  isWorkable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
