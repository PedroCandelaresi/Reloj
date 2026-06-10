import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('attendance_request_attachments')
@Index('IDX_attendance_request_attachments_company_request', ['companyId', 'attendanceRequestId'])
export class AttendanceRequestAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'attendance_request_id', type: 'uuid' })
  attendanceRequestId: string;

  @Column({ name: 'uploaded_by_user_id' })
  uploadedByUserId: number;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'stored_name' })
  storedName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'size_bytes' })
  sizeBytes: number;

  @Column({ name: 'storage_path' })
  storagePath: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
