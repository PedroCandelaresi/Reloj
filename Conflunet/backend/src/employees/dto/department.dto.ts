import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

function trimNullableValue({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class CreateDepartmentDto {
  @Transform(trimNullableValue)
  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDepartmentDto {
  @Transform(trimValue)
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
