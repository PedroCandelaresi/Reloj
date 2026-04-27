import { IsDateString, IsOptional, IsString } from 'class-validator';

export class DaySummariesQueryDto {
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
