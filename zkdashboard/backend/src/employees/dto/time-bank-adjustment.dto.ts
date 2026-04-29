import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class TimeBankAdjustmentDto {
  @Transform(trimValue)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD.',
  })
  date: string;

  @IsIn(['credit', 'debit', 'adjustment'])
  type: 'credit' | 'debit' | 'adjustment';

  @IsInt()
  @Min(1)
  @Max(1440)
  minutes: number;

  @Transform(trimValue)
  @IsString()
  @MaxLength(240)
  @IsOptional()
  reason?: string | null;
}
