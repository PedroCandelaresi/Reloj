import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { IsCuit } from '../validation/cuit.validator';
import { normalizeCuit } from '../validation/cuit.util';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function trimNullableValue({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class UpdateCompanyDto {
  @Transform(({ value }) => (value === undefined ? value : normalizeCuit(value)))
  @IsOptional()
  @IsString()
  @Length(11, 11)
  @IsCuit()
  cuit?: string;

  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreFantasia?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'El horario global de entrada debe tener formato HH:mm en 24 horas.',
  })
  defaultEntryTime?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'El horario global de salida debe tener formato HH:mm en 24 horas.',
  })
  defaultExitTime?: string | null;

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
