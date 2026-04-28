import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, Matches } from 'class-validator';

const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function trimNullableValue({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class UpdateCompanySettingsDto {
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

  @IsOptional()
  @IsArray()
  @IsIn(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], { each: true })
  defaultWorkDays?: string[] | null;
}
