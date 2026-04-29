import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function trimNullableValue({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class ScheduleProfileDayRuleDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @IsIn(['normal', 'summer', 'winter'])
  @IsOptional()
  season?: 'normal' | 'summer' | 'winter';

  @IsBoolean()
  @IsOptional()
  isWorkday?: boolean;

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

  @IsInt()
  @Min(0)
  @Max(480)
  @IsOptional()
  breakMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  expectedMinutes?: number | null;

  @IsInt()
  @Min(0)
  @Max(240)
  @IsOptional()
  lateToleranceMinutes?: number | null;

  @IsInt()
  @Min(0)
  @Max(240)
  @IsOptional()
  earlyDepartureToleranceMinutes?: number | null;

  @IsInt()
  @Min(0)
  @Max(480)
  @IsOptional()
  overtimeAfterMinutes?: number | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string | null;
}
