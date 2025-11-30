import { ReactNode } from 'react';

interface VisuallyHiddenProps {
  /** Content to hide visually but keep accessible */
  children: ReactNode;
  /** Optional tag name (default: span) */
  as?: 'span' | 'div' | 'label';
}

/**
 * VisuallyHidden Component
 * Hides content visually while keeping it accessible to screen readers
 * Essential for accessibility - use for icon-only buttons, form labels, etc.
 * 
 * @example
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Close menu</VisuallyHidden>
 * </button>
 * 
 * @example
 * <VisuallyHidden as="label" htmlFor="search">
 *   Search query
 * </VisuallyHidden>
 */
const VisuallyHidden = ({ 
  children, 
  as: Tag = 'span' 
}: VisuallyHiddenProps) => {
  return (
    <Tag
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
    >
      {children}
    </Tag>
  );
};

export default VisuallyHidden;
