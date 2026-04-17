import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CompanyRole } from '../company-role.enum';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class AssignCompanyUserDto {
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employeeId: string;

  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(200)
  password?: string;

  @IsEnum(CompanyRole)
  role: CompanyRole;
}
