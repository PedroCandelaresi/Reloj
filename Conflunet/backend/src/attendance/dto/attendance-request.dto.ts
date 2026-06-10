import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  AttendancePunchType,
  AttendanceRequestStatus,
  AttendanceRequestType,
} from '../entities/attendance-request.entity';
import { AttendanceAuditAction } from '../entities/attendance-audit-log.entity';

export class AttendanceRequestsQueryDto {
  @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
  @IsOptional()
  status?: AttendanceRequestStatus;

  @IsIn(['manual_punch', 'punch_correction', 'absence_justification', 'late_justification'])
  @IsOptional()
  type?: AttendanceRequestType;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;
}

export class CreateAttendanceRequestDto {
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsString()
  employeeId: string;

  @IsIn(['manual_punch', 'punch_correction', 'absence_justification', 'late_justification'])
  type: AttendanceRequestType;

  @IsUUID()
  @IsOptional()
  justificationTypeId?: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  punchTime?: string;

  @IsIn(['in', 'out', 'unknown'])
  @IsOptional()
  punchType?: AttendancePunchType;

  @IsInt()
  @IsOptional()
  targetAttendanceRecordId?: number;

  @IsString()
  @IsOptional()
  newPunchTime?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;

  @IsBoolean()
  @IsOptional()
  autoApprove?: boolean;
}

export class ReviewAttendanceRequestDto {
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  reviewNotes?: string;
}

export class AttendanceAuditLogQueryDto {
  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsIn([
    'manual_punch_created',
    'punch_corrected',
    'absence_justified',
    'late_justified',
    'request_created',
    'request_approved',
    'request_rejected',
    'request_cancelled',
  ])
  @IsOptional()
  action?: AttendanceAuditAction;

  @IsUUID()
  @IsOptional()
  requestId?: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;
}

export class AttendanceJustificationTypesQueryDto {
  @IsIn(['absence', 'late', 'early_departure', 'manual_punch', 'punch_correction', 'general'])
  @IsOptional()
  appliesTo?: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;
}
