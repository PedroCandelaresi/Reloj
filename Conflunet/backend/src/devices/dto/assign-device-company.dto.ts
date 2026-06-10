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

export class AssignDeviceCompanyDto {
  @Transform(trimValue)
  @IsUUID()
  companyId: string;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  alias?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;
}
