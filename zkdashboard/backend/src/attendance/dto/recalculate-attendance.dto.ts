import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RecalculateAttendanceDto {
  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;
}
