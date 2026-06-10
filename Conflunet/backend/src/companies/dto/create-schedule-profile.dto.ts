import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { ScheduleProfileDayRuleDto } from './schedule-profile-day-rule.dto';

const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH_DAY_PATTERN = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

function trimNullableValue({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class CreateScheduleProfileDto {
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Transform(trimValue)
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'La entrada base debe tener formato HH:mm en 24 horas.',
  })
  entryTime: string;

  @Transform(trimValue)
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'La salida base debe tener formato HH:mm en 24 horas.',
  })
  exitTime: string;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'La entrada de verano debe tener formato HH:mm en 24 horas.',
  })
  summerEntryTime?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'La salida de verano debe tener formato HH:mm en 24 horas.',
  })
  summerExitTime?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(MONTH_DAY_PATTERN, {
    message: 'El inicio de verano debe tener formato MM-DD.',
  })
  summerStart?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(MONTH_DAY_PATTERN, {
    message: 'El fin de verano debe tener formato MM-DD.',
  })
  summerEnd?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'La entrada de invierno debe tener formato HH:mm en 24 horas.',
  })
  winterEntryTime?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'La salida de invierno debe tener formato HH:mm en 24 horas.',
  })
  winterExitTime?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(MONTH_DAY_PATTERN, {
    message: 'El inicio de invierno debe tener formato MM-DD.',
  })
  winterStart?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(MONTH_DAY_PATTERN, {
    message: 'El fin de invierno debe tener formato MM-DD.',
  })
  winterEnd?: string | null;

  @IsInt()
  @Min(0)
  @Max(240)
  @IsOptional()
  lateToleranceMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(240)
  @IsOptional()
  earlyDepartureToleranceMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  expectedMinutesPerDay?: number | null;

  @IsArray()
  @IsOptional()
  workDays?: string[] | null;

  @IsInt()
  @Min(0)
  @Max(480)
  @IsOptional()
  breakMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(480)
  @IsOptional()
  overtimeAfterMinutes?: number;

  @IsIn(['none', 'weekly', 'daily_cycle'])
  @IsOptional()
  rotationMode?: 'none' | 'weekly' | 'daily_cycle';

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de inicio de rotación debe tener formato YYYY-MM-DD.',
  })
  rotationStartDate?: string | null;

  @IsInt()
  @Min(1)
  @Max(6)
  @IsOptional()
  rotationLengthWeeks?: number | null;

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  rotationLengthDays?: number | null;

  @IsBoolean()
  @IsOptional()
  timeBankEnabled?: boolean;

  @IsIn(['none', 'overtime_only', 'overtime_and_deficit'])
  @IsOptional()
  timeBankMode?: 'none' | 'overtime_only' | 'overtime_and_deficit';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleProfileDayRuleDto)
  @IsOptional()
  dayRules?: ScheduleProfileDayRuleDto[];
}
