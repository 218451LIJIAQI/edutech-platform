import { useState, useCallback, useMemo } from 'react';

type ValidationRule<T> = {
  validate: (value: T[keyof T], values: T) => boolean;
  message: string;
};

type FieldValidation<T> = {
  [K in keyof T]?: ValidationRule<T>[];
};

type FieldErrors<T> = {
  [K in keyof T]?: string;
};

type TouchedFields<T> = {
  [K in keyof T]?: boolean;
};

interface UseFormValidationReturn<T> {
  values: T;
  errors: FieldErrors<T>;
  touched: TouchedFields<T>;
  isValid: boolean;
  isDirty: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setFieldTouched: (field: keyof T) => void;
  validateField: (field: keyof T) => boolean;
  validateAll: () => boolean;
  reset: () => void;
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  getFieldProps: (field: keyof T) => {
    value: T[keyof T];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
  };
}

/**
 * useFormValidation Hook
 * Provides form state management and validation
 * 
 * @param initialValues - Initial form values
 * @param validationRules - Validation rules for each field
 * @returns Form state and handlers
 * 
 * @example
 * const { values, errors, handleChange, handleBlur, validateAll, getFieldProps } = useFormValidation(
 *   { email: '', password: '' },
 *   {
 *     email: [
 *       { validate: (v) => !!v, message: 'Email is required' },
 *       { validate: (v) => /\S+@\S+\.\S+/.test(String(v)), message: 'Invalid email' },
 *     ],
 *     password: [
 *       { validate: (v) => !!v, message: 'Password is required' },
 *       { validate: (v) => String(v).length >= 8, message: 'Min 8 characters' },
 *     ],
 *   }
 * );
 */
function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: FieldValidation<T> = {}
): UseFormValidationReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [touched, setTouched] = useState<TouchedFields<T>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T): boolean => {
      const rules = validationRules[field];
      if (!rules) return true;

      for (const rule of rules) {
        if (!rule.validate(values[field], values)) {
          setErrors((prev) => ({ ...prev, [field]: rule.message }));
          return false;
        }
      }

      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    },
    [values, validationRules]
  );

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: FieldErrors<T> = {};
    let isValid = true;

    for (const field of Object.keys(validationRules) as (keyof T)[]) {
      const rules = validationRules[field];
      if (!rules) continue;

      for (const rule of rules) {
        if (!rule.validate(values[field], values)) {
          newErrors[field] = rule.message;
          isValid = false;
          break;
        }
      }
    }

    setErrors(newErrors);
    // Mark all fields as touched
    const allTouched: TouchedFields<T> = {};
    for (const field of Object.keys(values) as (keyof T)[]) {
      allTouched[field] = true;
    }
    setTouched(allTouched);

    return isValid;
  }, [values, validationRules]);

  // Set a single field value
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  // Set multiple field values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
    setIsDirty(true);
  }, []);

  // Mark a field as touched
  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Reset form to initial state
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [initialValues]);

  // Handle change event for inputs
  const handleChange = useCallback(
    (field: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : e.target.value;
        setValue(field, value as T[keyof T]);
      },
    [setValue]
  );

  // Handle blur event (mark as touched)
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setFieldTouched(field);
      validateField(field);
    },
    [setFieldTouched, validateField]
  );

  // Get props for a field (convenience function)
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field],
      onChange: handleChange(field),
      onBlur: handleBlur(field),
    }),
    [values, handleChange, handleBlur]
  );

  // Calculate overall form validity
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setValue,
    setValues,
    setFieldTouched,
    validateField,
    validateAll,
    reset,
    handleChange,
    handleBlur,
    getFieldProps,
  };
}

// Common validation helpers
export const validators = {
  required: (message = 'This field is required') => ({
    validate: (value: unknown) => !!value && String(value).trim() !== '',
    message,
  }),
  email: (message = 'Invalid email address') => ({
    validate: (value: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
    message,
  }),
  minLength: (length: number, message = `Must be at least ${length} characters`) => ({
    validate: (value: unknown) => String(value).length >= length,
    message,
  }),
  maxLength: (length: number, message = `Must be at most ${length} characters`) => ({
    validate: (value: unknown) => String(value).length <= length,
    message,
  }),
  pattern: (regex: RegExp, message = 'Invalid format') => ({
    validate: (value: unknown) => regex.test(String(value)),
    message,
  }),
  match: <T>(field: keyof T, message = 'Fields do not match') => ({
    validate: (value: unknown, values: T) => value === values[field],
    message,
  }),
};

export default useFormValidation;
