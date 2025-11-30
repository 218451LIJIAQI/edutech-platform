import { useState, useRef, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useOnClickOutside } from '@/hooks';

interface DropdownItem {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  /** Trigger element or text */
  trigger: ReactNode;
  /** Dropdown items */
  items: DropdownItem[];
  /** Callback when item is selected */
  onSelect?: (value: string) => void;
  /** Alignment of dropdown menu */
  align?: 'left' | 'right';
  /** Width of dropdown menu */
  width?: 'auto' | 'full' | number;
  /** Additional className */
  className?: string;
}

/**
 * Dropdown Component
 * Customizable dropdown menu
 * 
 * @example
 * <Dropdown
 *   trigger={<button className="btn-secondary">Actions</button>}
 *   items={[
 *     { label: 'Edit', value: 'edit', icon: <Edit className="w-4 h-4" /> },
 *     { label: 'Delete', value: 'delete', icon: <Trash className="w-4 h-4" />, danger: true },
 *   ]}
 *   onSelect={(value) => handleAction(value)}
 * />
 */
const Dropdown = ({
  trigger,
  items,
  onSelect,
  align = 'left',
  width = 'auto',
  className,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  const handleSelect = (item: DropdownItem) => {
    if (item.disabled || item.divider) return;
    onSelect?.(item.value);
    setIsOpen(false);
  };

  const widthClass = typeof width === 'number' 
    ? `w-[${width}px]` 
    : width === 'full' 
      ? 'w-full' 
      : 'min-w-[180px]';

  return (
    <div ref={dropdownRef} className={clsx('relative inline-block', className)}>
      {/* Trigger */}
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={clsx(
            'absolute z-50 mt-2 py-1',
            'bg-white rounded-xl border border-gray-100 shadow-lg',
            'animate-fadeIn',
            widthClass,
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="h-px bg-gray-100 my-1" />;
            }

            return (
              <button
                key={item.value}
                onClick={() => handleSelect(item)}
                disabled={item.disabled}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left',
                  'transition-colors duration-150',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                  item.danger
                    ? 'text-danger-600 hover:bg-danger-50'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                )}
                role="menuitem"
              >
                {item.icon && (
                  <span className={clsx(item.danger ? 'text-danger-500' : 'text-gray-400')}>
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Simple Dropdown Button
 * Pre-styled dropdown with button trigger
 */
export const DropdownButton = ({
  label,
  items,
  onSelect,
  variant = 'secondary',
  size = 'md',
  ...props
}: Omit<DropdownProps, 'trigger'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  return (
    <Dropdown
      trigger={
        <button className={clsx('btn', variantClasses[variant], sizeClasses[size])}>
          {label}
          <ChevronDown className="w-4 h-4 ml-1" />
        </button>
      }
      items={items}
      onSelect={onSelect}
      {...props}
    />
  );
};

export default Dropdown;
