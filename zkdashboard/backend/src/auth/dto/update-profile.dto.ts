import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

function trimNullableValue({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class UpdateProfileDto {
  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido?: string | null;

  @Transform(trimNullableValue)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dni?: string | null;

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
}
