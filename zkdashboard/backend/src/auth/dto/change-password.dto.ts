import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsPasswordPolicy } from './password-policy';

function trimValue({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class ChangePasswordDto {
  @Transform(trimValue)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  currentPassword: string;

  @Transform(trimValue)
  @IsString()
  @IsPasswordPolicy()
  @MaxLength(200)
  newPassword: string;
}
