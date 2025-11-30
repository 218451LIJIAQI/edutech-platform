import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Select options */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Left icon */
  leftIcon?: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
  /** Success state */
  success?: boolean;
  /** Full width */
  fullWidth?: boolean;
}

/**
 * Select Component
 * Enhanced select dropdown with consistent styling
 * 
 * @example
 * <Select
 *   options={[
 *     { value: 'opt1', label: 'Option 1' },
 *     { value: 'opt2', label: 'Option 2' },
 *   ]}
 *   placeholder="Select an option"
 * />
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      placeholder,
      leftIcon,
      size = 'md',
      error = false,
      success = false,
      fullWidth = true,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'py-2 px-3 text-sm',
      md: 'py-3 px-4 text-base',
      lg: 'py-4 px-5 text-lg',
    };

    const iconSizeClasses = {
      sm: 'left-3',
      md: 'left-4',
      lg: 'left-5',
    };

    const paddingWithIcon = {
      sm: 'pl-9',
      md: 'pl-11',
      lg: 'pl-14',
    };

    return (
      <div className={clsx('relative', fullWidth && 'w-full')}>
        {/* Left Icon */}
        {leftIcon && (
          <span
            className={clsx(
              'absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10',
              iconSizeClasses[size]
            )}
          >
            {leftIcon}
          </span>
        )}

        <select
          ref={ref}
          disabled={disabled}
          className={clsx(
            'w-full rounded-xl border bg-white/95 backdrop-blur-sm appearance-none cursor-pointer',
            'transition-all duration-200 ease-out',
            'text-gray-900 pr-10',
            'focus:outline-none focus:ring-4',
            sizeClasses[size],
            leftIcon && paddingWithIcon[size],
            // Default state
            !error && !success && [
              'border-gray-200/80',
              'hover:border-gray-300 hover:bg-white',
              'focus:ring-primary-500/10 focus:border-primary-500',
            ],
            // Error state
            error && [
              'border-danger-400 bg-danger-50/30',
              'focus:ring-danger-500/10 focus:border-danger-500',
            ],
            // Success state
            success && [
              'border-success-400 bg-success-50/30',
              'focus:ring-success-500/10 focus:border-success-500',
            ],
            // Disabled state
            disabled && 'opacity-50 cursor-not-allowed bg-gray-100',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Dropdown Icon */}
        <ChevronDown
          className={clsx(
            'absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none',
            disabled && 'opacity-50'
          )}
        />
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
