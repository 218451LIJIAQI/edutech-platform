import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { useCopyToClipboard } from '@/hooks';

interface CopyButtonProps {
  /** Text to copy */
  text: string;
  /** Button label */
  label?: string;
  /** Success message duration in ms */
  successDuration?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Style variant */
  variant?: 'default' | 'ghost' | 'outline';
  /** Additional className */
  className?: string;
  /** Callback on successful copy */
  onCopy?: () => void;
}

/**
 * CopyButton Component
 * Button that copies text to clipboard with visual feedback
 * 
 * @example
 * <CopyButton text="npm install @edutech/sdk" />
 * 
 * @example
 * <CopyButton 
 *   text={referralCode}
 *   label="Copy Code"
 *   onCopy={() => toast.success('Copied!')}
 * />
 */
const CopyButton = ({
  text,
  label,
  successDuration = 2000,
  size = 'md',
  variant = 'default',
  className,
  onCopy,
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  const handleCopy = useCallback(async () => {
    const result = await copyToClipboard(text);
    if (result.success) {
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), successDuration);
    }
  }, [text, copyToClipboard, successDuration, onCopy]);

  const sizeClasses = {
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-base',
    lg: 'p-2.5 text-lg',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    ghost: 'hover:bg-gray-100 text-gray-500 hover:text-gray-700',
    outline: 'border border-gray-300 hover:border-gray-400 text-gray-600',
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg transition-all duration-200',
        sizeClasses[size],
        variantClasses[variant],
        copied && 'bg-success-100 text-success-700 hover:bg-success-100',
        className
      )}
      aria-label={copied ? 'Copied!' : `Copy ${label || 'to clipboard'}`}
    >
      {copied ? (
        <Check className={clsx(iconSizes[size], 'text-success-600')} />
      ) : (
        <Copy className={iconSizes[size]} />
      )}
      {label && (
        <span className="font-medium">
          {copied ? 'Copied!' : label}
        </span>
      )}
    </button>
  );
};

export default CopyButton;

/**
 * Inline copy text component
 * Shows text with a copy button
 */
export const CopyText = ({
  text,
  displayText,
  className,
}: {
  text: string;
  displayText?: string;
  className?: string;
}) => {
  return (
    <div className={clsx(
      'inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg',
      className
    )}>
      <code className="text-sm font-mono text-gray-800">
        {displayText || text}
      </code>
      <CopyButton text={text} size="sm" variant="ghost" />
    </div>
  );
};
