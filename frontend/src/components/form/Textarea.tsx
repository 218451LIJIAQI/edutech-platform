import { forwardRef, TextareaHTMLAttributes, useEffect, useRef } from 'react';
import clsx from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
  /** Success state */
  success?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Auto-resize based on content */
  autoResize?: boolean;
  /** Minimum number of rows */
  minRows?: number;
  /** Maximum number of rows (for autoResize) */
  maxRows?: number;
}

/**
 * Textarea Component
 * Enhanced textarea with auto-resize capability
 * 
 * @example
 * // Basic textarea
 * <Textarea placeholder="Enter description" rows={4} />
 * 
 * // Auto-resize textarea
 * <Textarea autoResize minRows={3} maxRows={10} placeholder="Type here..." />
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = 'md',
      error = false,
      success = false,
      fullWidth = true,
      autoResize = false,
      minRows = 3,
      maxRows = 10,
      className,
      disabled,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const sizeClasses = {
      sm: 'py-2 px-3 text-sm',
      md: 'py-3 px-4 text-base',
      lg: 'py-4 px-5 text-lg',
    };

    // Auto-resize logic
    useEffect(() => {
      if (!autoResize || !textareaRef.current) return;

      const textarea = textareaRef.current;
      const lineHeight = size === 'sm' ? 20 : size === 'lg' ? 28 : 24;
      const minHeight = minRows * lineHeight;
      const maxHeight = maxRows * lineHeight;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate new height
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Add overflow if content exceeds maxRows
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [value, autoResize, size, minRows, maxRows, textareaRef]);

    return (
      <textarea
        ref={textareaRef}
        disabled={disabled}
        value={value}
        onChange={onChange}
        rows={autoResize ? minRows : props.rows || 4}
        className={clsx(
          'rounded-xl border bg-white/95 backdrop-blur-sm resize-none',
          'transition-all duration-200 ease-out',
          'placeholder-gray-400 text-gray-900',
          'focus:outline-none focus:ring-4',
          fullWidth && 'w-full',
          sizeClasses[size],
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
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
