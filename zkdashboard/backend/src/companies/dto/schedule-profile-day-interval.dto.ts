import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class ScheduleProfileDayIntervalDto {
  @IsInt()
  @Min(1)
  @Max(4)
  sequence: number;

  @Transform(trimValue)
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'La entrada del intervalo debe tener formato HH:mm en 24 horas.',
  })
  entryTime: string;

  @Transform(trimValue)
  @IsString()
  @Matches(TIME_24H_PATTERN, {
    message: 'La salida del intervalo debe tener formato HH:mm en 24 horas.',
  })
  exitTime: string;

  @IsBoolean()
  @IsOptional()
  crossesMidnight?: boolean;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  expectedMinutes?: number | null;
}
