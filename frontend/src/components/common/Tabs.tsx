import { useState, createContext, useContext, ReactNode } from 'react';
import clsx from 'clsx';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  children: ReactNode;
  /** Default active tab ID */
  defaultValue?: string;
  /** Controlled active tab */
  value?: string;
  /** Callback when tab changes */
  onChange?: (value: string) => void;
  /** Additional className */
  className?: string;
}

interface TabListProps {
  children: ReactNode;
  /** Visual variant */
  variant?: 'default' | 'pills' | 'underline' | 'boxed';
  /** Full width tabs */
  fullWidth?: boolean;
  /** Additional className */
  className?: string;
}

interface TabProps {
  children: ReactNode;
  /** Unique tab identifier */
  value: string;
  /** Icon before label */
  icon?: ReactNode;
  /** Whether tab is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

interface TabPanelProps {
  children: ReactNode;
  /** Tab value this panel corresponds to */
  value: string;
  /** Additional className */
  className?: string;
}

/**
 * Tabs Component
 * Tabbed interface for organizing content
 * 
 * @example
 * <Tabs defaultValue="tab1">
 *   <TabList>
 *     <Tab value="tab1">First Tab</Tab>
 *     <Tab value="tab2">Second Tab</Tab>
 *   </TabList>
 *   <TabPanel value="tab1">Content 1</TabPanel>
 *   <TabPanel value="tab2">Content 2</TabPanel>
 * </Tabs>
 */
export const Tabs = ({
  children,
  defaultValue,
  value,
  onChange,
  className,
}: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  
  const activeTab = value !== undefined ? value : internalValue;
  
  const setActiveTab = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

/**
 * TabList - Container for tab triggers
 */
export const TabList = ({
  children,
  variant = 'default',
  fullWidth = false,
  className,
}: TabListProps) => {
  const variantClasses = {
    default: 'flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl',
    pills: 'flex items-center gap-2',
    underline: 'flex items-center gap-6 border-b border-gray-200',
    boxed: 'flex items-center border border-gray-200 rounded-xl overflow-hidden',
  };

  return (
    <div
      role="tablist"
      className={clsx(
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Tab - Individual tab trigger
 */
export const Tab = ({
  children,
  value,
  icon,
  disabled = false,
  className,
}: TabProps) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      onClick={() => !disabled && setActiveTab(value)}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
        isActive
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

/**
 * TabPanel - Content panel for each tab
 */
export const TabPanel = ({
  children,
  value,
  className,
}: TabPanelProps) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  const { activeTab } = context;
  
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={clsx('animate-fadeIn mt-4', className)}
    >
      {children}
    </div>
  );
};

export default Tabs;
