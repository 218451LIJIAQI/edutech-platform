import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the button is in loading state */
  isLoading?: boolean;
  /** Text to show while loading (optional) */
  loadingText?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Icon to display before text */
  leftIcon?: ReactNode;
  /** Icon to display after text */
  rightIcon?: ReactNode;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Children content */
  children: ReactNode;
}

/**
 * LoadingButton Component
 * Button with loading state, icons, and multiple variants
 * 
 * @example
 * <LoadingButton 
 *   isLoading={isSubmitting}
 *   loadingText="Saving..."
 *   variant="primary"
 *   leftIcon={<Save className="w-4 h-4" />}
 * >
 *   Save Changes
 * </LoadingButton>
 */
const LoadingButton = ({
  isLoading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: LoadingButtonProps) => {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost',
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  return (
    <button
      className={clsx(
        'btn',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export default LoadingButton;
