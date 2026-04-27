import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidCuit } from './cuit.util';

@ValidatorConstraint({ name: 'isCuit', async: false })
export class IsCuitConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidCuit(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} debe ser un CUIT válido`;
  }
}

export function IsCuit(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCuitConstraint,
    });
  };
}
