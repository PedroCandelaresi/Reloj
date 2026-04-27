import { Matches, MinLength } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function IsPasswordPolicy() {
  return function (target: object, propertyName: string | symbol) {
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    })(target, propertyName);
    Matches(PASSWORD_COMPLEXITY_PATTERN, {
      message: 'La contraseña debe incluir al menos una letra y un número.',
    })(target, propertyName);
  };
}
