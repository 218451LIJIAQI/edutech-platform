import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text */
  label?: ReactNode;
  /** Description text below label */
  description?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
}

/**
 * Radio Component
 * Custom styled radio button with label support
 * 
 * @example
 * // Basic radio group
 * <Radio name="plan" value="free" label="Free Plan" />
 * <Radio name="plan" value="pro" label="Pro Plan" />
 */
const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      size = 'md',
      error = false,
      className,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: { box: 'w-4 h-4', dot: 'w-1.5 h-1.5', text: 'text-sm', gap: 'gap-2' },
      md: { box: 'w-5 h-5', dot: 'w-2 h-2', text: 'text-base', gap: 'gap-3' },
      lg: { box: 'w-6 h-6', dot: 'w-2.5 h-2.5', text: 'text-lg', gap: 'gap-3' },
    };

    const sizes = sizeClasses[size];

    return (
      <label
        className={clsx(
          'relative flex items-start cursor-pointer select-none',
          sizes.gap,
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          ref={ref}
          type="radio"
          disabled={disabled}
          checked={checked}
          className="sr-only peer"
          {...props}
        />
        
        {/* Custom radio circle */}
        <span
          className={clsx(
            'flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            sizes.box,
            // Unchecked state
            !checked && [
              'border-gray-300 bg-white',
              'peer-hover:border-primary-400 peer-hover:bg-primary-50',
              'peer-focus:ring-4 peer-focus:ring-primary-500/20',
            ],
            // Checked state
            checked && [
              'border-primary-600 bg-white',
              'peer-hover:border-primary-700',
            ],
            // Error state
            error && 'border-danger-400 peer-hover:border-danger-500',
          )}
        >
          {checked && (
            <span className={clsx(sizes.dot, 'rounded-full bg-primary-600')} />
          )}
        </span>

        {/* Label and description */}
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className={clsx(
                sizes.text,
                'font-medium text-gray-900 leading-tight',
                disabled && 'text-gray-500'
              )}>
                {label}
              </span>
            )}
            {description && (
              <span className="text-sm text-gray-500 mt-0.5">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';

/**
 * RadioGroup Component
 * Container for grouping radio buttons
 */
export const RadioGroup = ({
  children,
  label,
  error,
  className,
}: {
  children: ReactNode;
  label?: string;
  error?: string;
  className?: string;
}) => {
  return (
    <div className={clsx('space-y-2', className)} role="radiogroup">
      {label && (
        <span className="block text-sm font-semibold text-gray-700 mb-3">
          {label}
        </span>
      )}
      <div className="space-y-2">
        {children}
      </div>
      {error && (
        <p className="text-sm text-danger-600 mt-2">{error}</p>
      )}
    </div>
  );
};

export default Radio;
