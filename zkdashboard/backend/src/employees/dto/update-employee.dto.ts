import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

function trimNullableValue({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class UpdateEmployeeDto {
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido?: string;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsUUID()
  companyId?: string | null;
}
