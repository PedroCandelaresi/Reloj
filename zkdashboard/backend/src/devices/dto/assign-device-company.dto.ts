import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
}
