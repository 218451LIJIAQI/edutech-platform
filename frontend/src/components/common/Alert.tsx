import { ReactNode, useState } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';
import clsx from 'clsx';

type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

interface AlertProps {
  /** Alert variant/type */
  variant?: AlertVariant;
  /** Alert title */
  title?: string;
  /** Alert description/content */
  children: ReactNode;
  /** Custom icon */
  icon?: ReactNode;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Action buttons */
  action?: ReactNode;
  /** Additional className */
  className?: string;
}

const variantConfig: Record<AlertVariant, {
  containerClass: string;
  iconClass: string;
  icon: ReactNode;
}> = {
  info: {
    containerClass: 'bg-sky-50/80 border-sky-200/60 text-sky-800',
    iconClass: 'text-sky-500',
    icon: <Info className="w-5 h-5" />,
  },
  success: {
    containerClass: 'bg-success-50/80 border-success-200/60 text-success-800',
    iconClass: 'text-success-500',
    icon: <CheckCircle className="w-5 h-5" />,
  },
  warning: {
    containerClass: 'bg-warning-50/80 border-warning-200/60 text-warning-800',
    iconClass: 'text-warning-500',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  error: {
    containerClass: 'bg-danger-50/80 border-danger-200/60 text-danger-800',
    iconClass: 'text-danger-500',
    icon: <AlertCircle className="w-5 h-5" />,
  },
  neutral: {
    containerClass: 'bg-gray-50/80 border-gray-200/60 text-gray-800',
    iconClass: 'text-gray-500',
    icon: <Info className="w-5 h-5" />,
  },
};

/**
 * Alert Component
 * Display important messages with various severity levels
 * 
 * @example
 * // Basic alert
 * <Alert variant="success">Operation completed successfully!</Alert>
 * 
 * // With title
 * <Alert variant="warning" title="Warning">
 *   Please review before continuing.
 * </Alert>
 * 
 * // Dismissible with action
 * <Alert 
 *   variant="error" 
 *   dismissible 
 *   action={<button className="btn-sm btn-outline">Retry</button>}
 * >
 *   Something went wrong.
 * </Alert>
 */
const Alert = ({
  variant = 'info',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  action,
  className,
}: AlertProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const config = variantConfig[variant];

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      className={clsx(
        'flex gap-3 p-4 rounded-xl border animate-fadeIn',
        config.containerClass,
        className
      )}
    >
      {/* Icon */}
      <span className={clsx('flex-shrink-0 mt-0.5', config.iconClass)}>
        {icon || config.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold mb-1">{title}</h4>
        )}
        <div className={clsx('text-sm', title && 'opacity-90')}>
          {children}
        </div>
        
        {/* Action */}
        {action && (
          <div className="mt-3">{action}</div>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className={clsx(
            'flex-shrink-0 p-1 rounded-lg',
            'hover:bg-black/5 transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-current'
          )}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
