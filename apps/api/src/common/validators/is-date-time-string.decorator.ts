import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';

// Date-only values are intentionally rejected; callers must provide a time.
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

export function IsDateTimeString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateTimeString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && ISO_DATE_TIME_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ISO date-time`;
        },
      },
    });
  };
}
