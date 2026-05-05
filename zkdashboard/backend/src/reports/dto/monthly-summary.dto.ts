import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class MonthlySummaryDto {
  @IsNumberString()
  year: string;

  @IsNumberString()
  month: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  positionId?: string;

  @IsIn(['true', 'false'])
  @IsOptional()
  includeInactive?: string;

  @IsIn(['excel', 'json'])
  @IsOptional()
  format?: 'excel' | 'json';
}
