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

      result.array({ onlyFirstError: false }).forEach((err) => {
        const error = err as ValidationError & { type?: string; path?: string; param?: string; msg?: unknown };
        const isFieldError = error.type === 'field';
        const key = isFieldError ? (error.path ?? error.param ?? '_global') : '_global';
        const msg = String(error.msg ?? 'Validation failed');

        if (!extractedErrors[key]) {
          extractedErrors[key] = [];
        }
        // Avoid duplicate error messages
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
      return next(err as Error);
    }
  };
};

export default validate;
