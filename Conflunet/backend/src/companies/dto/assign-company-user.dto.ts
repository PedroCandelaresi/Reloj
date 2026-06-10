import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsPasswordPolicy } from '../../auth/dto/password-policy';
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
  @IsPasswordPolicy()
  @MaxLength(200)
  password?: string;

  @IsEnum(CompanyRole)
  role: CompanyRole;
}
