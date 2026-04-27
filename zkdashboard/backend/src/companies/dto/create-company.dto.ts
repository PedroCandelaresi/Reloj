import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { IsCuit } from '../validation/cuit.validator';
import { normalizeCuit } from '../validation/cuit.util';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

function trimNullableValue({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class CreateCompanyDto {
  @Transform(({ value }) => normalizeCuit(value))
  @IsString()
  @Length(11, 11)
  @IsCuit()
  cuit: string;

  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  razonSocial: string;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreFantasia?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
