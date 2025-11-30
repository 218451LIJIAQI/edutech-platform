import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text */
  label?: ReactNode;
  /** Description text below label */
  description?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Label position */
  labelPosition?: 'left' | 'right';
  /** Color when active */
  activeColor?: 'primary' | 'success' | 'danger' | 'warning';
}

/**
 * Switch Component
 * Toggle switch with label support
 * 
 * @example
 * // Basic switch
 * <Switch label="Enable notifications" />
 * 
 * // With description
 * <Switch 
 *   label="Dark mode"
 *   description="Use dark theme across the platform"
 *   activeColor="primary"
 * />
 */
const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      description,
      size = 'md',
      labelPosition = 'right',
      activeColor = 'primary',
      className,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: { track: 'w-8 h-5', thumb: 'w-3.5 h-3.5', translate: 'translate-x-3.5', text: 'text-sm' },
      md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5', text: 'text-base' },
      lg: { track: 'w-14 h-8', thumb: 'w-6 h-6', translate: 'translate-x-6', text: 'text-lg' },
    };

    const colorClasses = {
      primary: 'peer-checked:bg-primary-600',
      success: 'peer-checked:bg-success-600',
      danger: 'peer-checked:bg-danger-600',
      warning: 'peer-checked:bg-warning-600',
    };

    const sizes = sizeClasses[size];

    const labelContent = (label || description) && (
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
    );

    return (
      <label
        className={clsx(
          'relative flex items-center cursor-pointer select-none gap-3',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        {labelPosition === 'left' && labelContent}
        
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          checked={checked}
          role="switch"
          aria-checked={checked}
          className="sr-only peer"
          {...props}
        />
        
        {/* Track */}
        <span
          className={clsx(
            'relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out',
            sizes.track,
            'bg-gray-200',
            colorClasses[activeColor],
            'peer-focus:ring-4 peer-focus:ring-primary-500/20',
          )}
        >
          {/* Thumb */}
          <span
            className={clsx(
              'pointer-events-none inline-block rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out',
              sizes.thumb,
              'm-0.5',
              checked ? sizes.translate : 'translate-x-0'
            )}
          />
        </span>

        {labelPosition === 'right' && labelContent}
      </label>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch;
