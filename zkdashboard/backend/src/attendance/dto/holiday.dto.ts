import { IsBoolean, IsDateString, IsIn, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class HolidayQueryDto {
  @IsNumberString()
  @IsOptional()
  year?: string;

  @IsNumberString()
  @IsOptional()
  month?: string;

  @IsString()
  @IsOptional()
  companyId?: string;
}

export class CreateHolidayDto {
  @IsDateString()
  date: string;

  @IsString()
  @MaxLength(160)
  name: string;

  @IsIn(['national', 'company', 'regional'])
  @IsOptional()
  type?: 'national' | 'company' | 'regional';

  @IsBoolean()
  @IsOptional()
  isWorkable?: boolean;

  @IsString()
  @IsOptional()
  companyId?: string | null;
}

export class UpdateHolidayDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  name?: string;

  @IsIn(['national', 'company', 'regional'])
  @IsOptional()
  type?: 'national' | 'company' | 'regional';

  @IsBoolean()
  @IsOptional()
  isWorkable?: boolean;

  @IsString()
  @IsOptional()
  companyId?: string | null;
}
