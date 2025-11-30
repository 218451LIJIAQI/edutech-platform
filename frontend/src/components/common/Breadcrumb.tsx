import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import clsx from 'clsx';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Show home icon as first item */
  showHome?: boolean;
  /** Home link path */
  homePath?: string;
  /** Separator between items */
  separator?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Breadcrumb Component
 * Navigation breadcrumb trail
 * 
 * @example
 * <Breadcrumb
 *   items={[
 *     { label: 'Courses', href: '/courses' },
 *     { label: 'React Fundamentals', href: '/courses/1' },
 *     { label: 'Lesson 1' }
 *   ]}
 *   showHome
 * />
 */
const Breadcrumb = ({
  items,
  showHome = true,
  homePath = '/',
  separator,
  className,
}: BreadcrumbProps) => {
  const defaultSeparator = (
    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
  );

  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: 'Home', href: homePath, icon: <Home className="w-4 h-4" /> }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={clsx('flex items-center', className)}>
      <ol className="flex items-center flex-wrap gap-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <span className="mx-1" aria-hidden="true">
                  {separator || defaultSeparator}
                </span>
              )}
              
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-1.5 text-sm font-medium',
                    'text-gray-500 hover:text-primary-600 transition-colors duration-200',
                    'hover:underline underline-offset-2'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={clsx(
                    'flex items-center gap-1.5 text-sm font-medium',
                    isLast ? 'text-gray-900' : 'text-gray-500'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon}
                  <span className={isLast ? 'line-clamp-1' : ''}>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
