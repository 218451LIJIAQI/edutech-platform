import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Number of page buttons to show on each side of current page */
  siblingCount?: number;
  /** Whether to show first/last page buttons */
  showEdges?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Pagination Component
 * Displays page navigation with smart ellipsis
 * 
 * @example
 * <Pagination
 *   currentPage={page}
 *   totalPages={20}
 *   onPageChange={setPage}
 *   siblingCount={1}
 * />
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showEdges = true,
  size = 'md',
  disabled = false,
}: PaginationProps) => {
  // Generate page numbers to display
  const generatePageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    
    // Always show first page
    if (showEdges) pages.push(1);
    
    // Calculate range around current page
    const leftSibling = Math.max(currentPage - siblingCount, showEdges ? 2 : 1);
    const rightSibling = Math.min(currentPage + siblingCount, showEdges ? totalPages - 1 : totalPages);
    
    // Add left ellipsis if needed
    if (leftSibling > (showEdges ? 2 : 1)) {
      pages.push('ellipsis');
    }
    
    // Add pages around current
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    
    // Add right ellipsis if needed
    if (rightSibling < (showEdges ? totalPages - 1 : totalPages)) {
      pages.push('ellipsis');
    }
    
    // Always show last page
    if (showEdges && totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        className={clsx(
          'flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600',
          'hover:bg-gray-50 hover:border-gray-300 transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white',
          sizeClasses[size]
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className={iconSizes[size]} />
      </button>

      {/* Page Numbers */}
      {generatePageNumbers().map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${index}`}
              className={clsx(
                'flex items-center justify-center text-gray-400',
                sizeClasses[size]
              )}
            >
              <MoreHorizontal className={iconSizes[size]} />
            </span>
          );
        }

        const isActive = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={disabled}
            className={clsx(
              'flex items-center justify-center rounded-lg font-medium transition-all duration-200',
              sizeClasses[size],
              isActive
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-label={`Page ${page}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {page}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        className={clsx(
          'flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600',
          'hover:bg-gray-50 hover:border-gray-300 transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white',
          sizeClasses[size]
        )}
        aria-label="Next page"
      >
        <ChevronRight className={iconSizes[size]} />
      </button>
    </nav>
  );
};

export default Pagination;
