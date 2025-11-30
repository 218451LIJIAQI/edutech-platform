import { useState, createContext, useContext, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (id: string) => void;
  multiple: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

interface AccordionProps {
  children: ReactNode;
  /** Allow multiple items open at once */
  multiple?: boolean;
  /** Default open item(s) */
  defaultOpen?: string | string[];
  /** Additional className */
  className?: string;
}

interface AccordionItemProps {
  children: ReactNode;
  /** Unique item identifier */
  value: string;
  /** Additional className */
  className?: string;
}

interface AccordionTriggerProps {
  children: ReactNode;
  /** Icon to display */
  icon?: ReactNode;
  /** Additional className */
  className?: string;
}

interface AccordionContentProps {
  children: ReactNode;
  /** Additional className */
  className?: string;
}

const AccordionItemContext = createContext<{ value: string; isOpen: boolean } | null>(null);

/**
 * Accordion Component
 * Collapsible content sections
 * 
 * @example
 * <Accordion defaultOpen="item1">
 *   <AccordionItem value="item1">
 *     <AccordionTrigger>Section 1</AccordionTrigger>
 *     <AccordionContent>Content 1</AccordionContent>
 *   </AccordionItem>
 *   <AccordionItem value="item2">
 *     <AccordionTrigger>Section 2</AccordionTrigger>
 *     <AccordionContent>Content 2</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 */
export const Accordion = ({
  children,
  multiple = false,
  defaultOpen,
  className,
}: AccordionProps) => {
  const [openItems, setOpenItems] = useState<string[]>(() => {
    if (!defaultOpen) return [];
    return Array.isArray(defaultOpen) ? defaultOpen : [defaultOpen];
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (multiple) {
        return [...prev, id];
      }
      return [id];
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, multiple }}>
      <div className={clsx('space-y-2', className)}>{children}</div>
    </AccordionContext.Provider>
  );
};

/**
 * AccordionItem - Individual accordion section
 */
export const AccordionItem = ({
  children,
  value,
  className,
}: AccordionItemProps) => {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionItem must be used within Accordion');

  const isOpen = context.openItems.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div
        className={clsx(
          'bg-white rounded-xl border border-gray-100 overflow-hidden',
          'transition-all duration-200',
          isOpen && 'shadow-md border-gray-200',
          className
        )}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

/**
 * AccordionTrigger - Clickable header
 */
export const AccordionTrigger = ({
  children,
  icon,
  className,
}: AccordionTriggerProps) => {
  const accordionContext = useContext(AccordionContext);
  const itemContext = useContext(AccordionItemContext);
  
  if (!accordionContext || !itemContext) {
    throw new Error('AccordionTrigger must be used within AccordionItem');
  }

  const { toggleItem } = accordionContext;
  const { value, isOpen } = itemContext;

  return (
    <button
      onClick={() => toggleItem(value)}
      aria-expanded={isOpen}
      className={clsx(
        'w-full flex items-center justify-between gap-4 p-4 text-left',
        'font-medium text-gray-900',
        'hover:bg-gray-50 transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/50',
        className
      )}
    >
      <span className="flex items-center gap-3">
        {icon && <span className="text-gray-400">{icon}</span>}
        {children}
      </span>
      <ChevronDown
        className={clsx(
          'w-5 h-5 text-gray-400 transition-transform duration-300 ease-out',
          isOpen && 'rotate-180'
        )}
      />
    </button>
  );
};

/**
 * AccordionContent - Collapsible content area
 */
export const AccordionContent = ({
  children,
  className,
}: AccordionContentProps) => {
  const itemContext = useContext(AccordionItemContext);
  if (!itemContext) {
    throw new Error('AccordionContent must be used within AccordionItem');
  }

  const { isOpen } = itemContext;

  return (
    <div
      className={clsx(
        'grid transition-all duration-300 ease-out',
        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="overflow-hidden">
        <div className={clsx('px-4 pb-4 text-gray-600', className)}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Accordion;
