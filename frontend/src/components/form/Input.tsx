import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Left icon */
  leftIcon?: ReactNode;
  /** Right icon */
  rightIcon?: ReactNode;
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
 * Input Component
 * Enhanced input with icons, password toggle, and various states
 * 
 * @example
 * // Basic input
 * <Input placeholder="Enter email" />
 * 
 * // With icon
 * <Input leftIcon={<Mail className="w-5 h-5" />} placeholder="Email" />
 * 
 * // Password with toggle
 * <Input type="password" placeholder="Password" />
 * 
 * // With error state
 * <Input error placeholder="Invalid input" />
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      leftIcon,
      rightIcon,
      size = 'md',
      error = false,
      success = false,
      fullWidth = true,
      type = 'text',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

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
              'absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none',
              iconSizeClasses[size]
            )}
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          type={inputType}
          disabled={disabled}
          className={clsx(
            'w-full rounded-xl border bg-white/95 backdrop-blur-sm',
            'transition-all duration-200 ease-out',
            'placeholder-gray-400 text-gray-900',
            'focus:outline-none focus:ring-4',
            sizeClasses[size],
            leftIcon && paddingWithIcon[size],
            (rightIcon || isPassword) && 'pr-11',
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
        />

        {/* Right Icon or Password Toggle */}
        {(rightIcon || isPassword) && (
          <span
            className={clsx(
              'absolute right-4 top-1/2 -translate-y-1/2',
              isPassword ? 'cursor-pointer text-gray-400 hover:text-gray-600' : 'text-gray-400 pointer-events-none'
            )}
            onClick={isPassword ? () => setShowPassword(!showPassword) : undefined}
          >
            {isPassword ? (
              showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )
            ) : (
              rightIcon
            )}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
