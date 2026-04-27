import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsPasswordPolicy } from '../../auth/dto/password-policy';
import { CompanyRole } from '../company-role.enum';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateCompanyUserDto {
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  username?: string;

  @IsOptional()
  @IsString()
  @IsPasswordPolicy()
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsEnum(CompanyRole)
  role?: CompanyRole;
}
