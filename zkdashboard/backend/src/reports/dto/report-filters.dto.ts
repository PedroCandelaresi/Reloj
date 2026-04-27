import { IsDateString, IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class ReportFiltersDto {
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsIn(['excel', 'json'])
  @IsOptional()
  format?: 'excel' | 'json';

  @IsNumberString()
  @IsOptional()
  page?: string;

  @IsNumberString()
  @IsOptional()
  limit?: string;
}
