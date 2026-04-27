import { IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from './password-policy';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  password: string;
}
