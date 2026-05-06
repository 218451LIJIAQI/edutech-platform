import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Package, Search, FileX, Users, BookOpen } from 'lucide-react';

type EmptyStateVariant = 'default' | 'search' | 'error' | 'courses' | 'users';

type EmptyStateAction =
  | {
      label: string;
      href: string;
      onClick?: never;
    }
  | {
      label: string;
      onClick: () => void;
      href?: never;
    };

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant?: EmptyStateVariant;
  action?: EmptyStateAction;
  children?: ReactNode;
  className?: string;
}

const variantIcons: Record<EmptyStateVariant, LucideIcon> = {
  default: Package,
  search: Search,
  error: FileX,
  courses: BookOpen,
  users: Users,
};

const actionClassName =
  'inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300';

/**
 * EmptyState Component
 * Displays a clear and friendly message when there is no content to show.
 */
const EmptyState = ({
  title,
  description,
  icon,
  variant = 'default',
  action,
  children,
  className = '',
}: EmptyStateProps) => {
  const Icon = icon ?? variantIcons[variant];

  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-16 text-center ${className}`}
    >
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 shadow-inner">
        <Icon className="h-10 w-10 text-gray-400" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>

      {/* Description */}
      {description && (
        <p className="mb-6 max-w-sm leading-relaxed text-gray-500">
          {description}
        </p>
      )}

      {/* Action Button / Link */}
      {action &&
        (typeof action.href === 'string' ? (
          <Link to={action.href} className={actionClassName}>
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className={actionClassName}
          >
            {action.label}
          </button>
        ))}

      {/* Custom Children */}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
};

export default EmptyState;
