import type { RequestHandler } from "express";
import {
  validationResult,
  type ValidationChain,
  type ValidationError,
} from "express-validator";

const GLOBAL_ERROR_KEY = "_global";

type ValidationErrorMap = Record<string, string[]>;

const normalizeValidationMessage = (message: unknown): string => {
  if (typeof message === "string") {
    return message;
  }

  if (message instanceof Error) {
    return message.message;
  }

  try {
    const jsonMessage = JSON.stringify(message);
    return jsonMessage || "Validation failed";
  } catch {
    return String(message || "Validation failed");
  }
};

const addValidationError = (
  errors: ValidationErrorMap,
  key: string | undefined,
  message: unknown,
): void => {
  const fieldKey = key && key.trim().length > 0 ? key : GLOBAL_ERROR_KEY;
  const errorMessage = normalizeValidationMessage(message);

  if (!errors[fieldKey]) {
    errors[fieldKey] = [];
  }

  if (!errors[fieldKey].includes(errorMessage)) {
    errors[fieldKey].push(errorMessage);
  }
};

const collectValidationError = (
  errors: ValidationErrorMap,
  error: ValidationError,
): void => {
  switch (error.type) {
    case "field":
      addValidationError(errors, error.path, error.msg);
      break;

    case "unknown_fields":
      if (error.fields.length === 0) {
        addValidationError(errors, GLOBAL_ERROR_KEY, error.msg);
        break;
      }

      error.fields.forEach((field) => {
        addValidationError(
          errors,
          field.path,
          error.msg || "Unknown field is not allowed",
        );
      });
      break;

    case "alternative":
      if (error.nestedErrors.length === 0) {
        addValidationError(errors, GLOBAL_ERROR_KEY, error.msg);
        break;
      }

      error.nestedErrors.forEach((nestedError) => {
        collectValidationError(errors, nestedError);
      });
      break;

    case "alternative_grouped":
      if (error.nestedErrors.length === 0) {
        addValidationError(errors, GLOBAL_ERROR_KEY, error.msg);
        break;
      }

      error.nestedErrors.flat().forEach((nestedError) => {
        collectValidationError(errors, nestedError);
      });
      break;

    default:
      addValidationError(errors, GLOBAL_ERROR_KEY, "Validation failed");
  }
};

/**
 * Runs express-validator validation chains and returns a consistent error response.
 *
 * Supports:
 * - single validation chain
 * - multiple validation chains
 * - field errors
 * - global errors
 * - unknown field errors
 * - alternative validation errors
 */
export const validate = (
  validations: ValidationChain | ValidationChain[],
): RequestHandler => {
  const chains = Array.isArray(validations) ? validations : [validations];

  return async (req, res, next) => {
    try {
      await Promise.all(chains.map((validation) => validation.run(req)));

      const result = validationResult(req);

      if (result.isEmpty()) {
        return next();
      }

      const errors: ValidationErrorMap = {};

      result.array({ onlyFirstError: false }).forEach((error) => {
        collectValidationError(errors, error);
      });

      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors,
      });
    } catch (error) {
      return next(error);
    }
  };
};
