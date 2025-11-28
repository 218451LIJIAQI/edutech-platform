import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validationResult, ValidationChain, type ValidationError } from 'express-validator';

/**
 * Middleware to handle validation results from express-validator
 */
export const validate = (validations: ValidationChain | ValidationChain[]): RequestHandler => {
  const chains = Array.isArray(validations) ? validations : [validations];

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Run all validations
      await Promise.all(chains.map((validation) => validation.run(req)));

      // Check for errors
      const result = validationResult(req);

      if (result.isEmpty()) {
        return next();
      }

      // Format errors (include both field and non-field errors)
      const extractedErrors: Record<string, string[]> = {};

      (result.array({ onlyFirstError: false }) as ValidationError[]).forEach((err) => {
        const isFieldError = (err as any).type === 'field';
        const key = isFieldError ? ((err as any).path ?? (err as any).param ?? '_global') : '_global';
        const msg = String((err as any).msg);

        if (!extractedErrors[key]) {
          extractedErrors[key] = [];
        }
        if (!extractedErrors[key].includes(msg)) {
          extractedErrors[key].push(msg);
        }
      });

      // Return validation error
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: extractedErrors,
      });
    } catch (err) {
      // Forward unexpected errors to error handler
      return next(err as unknown);
    }
  };
};

export default validate;
