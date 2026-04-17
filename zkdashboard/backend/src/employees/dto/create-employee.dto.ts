import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

function trimNullableValue({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class CreateEmployeeDto {
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  id: string;

  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido: string;

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
