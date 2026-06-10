import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

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
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'El horario de entrada debe tener formato HH:mm en 24 horas.',
  })
  entryTime?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'El horario de salida debe tener formato HH:mm en 24 horas.',
  })
  exitTime?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsUUID()
  scheduleProfileId?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsUUID()
  positionId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  inactiveReason?: string | null;
}
