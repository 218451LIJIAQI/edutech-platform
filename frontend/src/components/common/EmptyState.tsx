import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, Package, Search, FileX, Users, BookOpen } from 'lucide-react';

type EmptyStateVariant = 'default' | 'search' | 'error' | 'courses' | 'users';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant?: EmptyStateVariant;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  children?: ReactNode;
}

const variantIcons: Record<EmptyStateVariant, LucideIcon> = {
  default: Package,
  search: Search,
  error: FileX,
  courses: BookOpen,
  users: Users,
};

/**
 * EmptyState Component
 * Displays a friendly message when there's no content to show
 */
const EmptyState = ({
  title,
  description,
  icon,
  variant = 'default',
  action,
  children,
}: EmptyStateProps) => {
  const Icon = icon || variantIcons[variant];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      )}

      {/* Action Button */}
      {action && (
        action.href ? (
          <Link
            to={action.href}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300"
          >
            {action.label}
          </button>
        )
      )}

      {/* Custom Children */}
      {children}
    </div>
  );
};

export default EmptyState;
