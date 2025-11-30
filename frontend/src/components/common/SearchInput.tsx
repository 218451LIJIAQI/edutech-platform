import { useState, useRef, useEffect, ReactNode, KeyboardEvent } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useDebounce, useOnClickOutside } from '@/hooks';

interface SearchInputProps {
  /** Current value */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Callback when search is submitted */
  onSearch?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether search is loading */
  loading?: boolean;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show clear button */
  clearable?: boolean;
  /** Dropdown suggestions */
  suggestions?: string[];
  /** Callback when suggestion is selected */
  onSuggestionSelect?: (value: string) => void;
  /** Recent searches */
  recentSearches?: string[];
  /** Left icon override */
  icon?: ReactNode;
  /** Whether input is full width */
  fullWidth?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * SearchInput Component
 * Enhanced search input with debounce, suggestions, and recent searches
 * 
 * @example
 * // Basic usage
 * <SearchInput
 *   placeholder="Search courses..."
 *   onSearch={(query) => fetchResults(query)}
 *   debounceMs={300}
 * />
 * 
 * // With suggestions
 * <SearchInput
 *   suggestions={filteredSuggestions}
 *   onSuggestionSelect={(value) => handleSelect(value)}
 *   recentSearches={['react', 'javascript']}
 * />
 */
const SearchInput = ({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'Search...',
  loading = false,
  debounceMs = 300,
  size = 'md',
  clearable = true,
  suggestions = [],
  onSuggestionSelect,
  recentSearches = [],
  icon,
  fullWidth = false,
  className,
}: SearchInputProps) => {
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const debouncedValue = useDebounce(value, debounceMs);

  // Close dropdown on outside click
  useOnClickOutside(containerRef, () => setIsFocused(false), isFocused);

  // Trigger search on debounced value change
  useEffect(() => {
    if (debouncedValue && onSearch) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  const handleChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
    setHighlightIndex(-1);
  };

  const handleClear = () => {
    handleChange('');
    inputRef.current?.focus();
  };

  const handleSelect = (selectedValue: string) => {
    handleChange(selectedValue);
    onSuggestionSelect?.(selectedValue);
    setIsFocused(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const items = suggestions.length > 0 ? suggestions : recentSearches;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0 && items[highlightIndex]) {
        handleSelect(items[highlightIndex]);
      } else if (onSearch) {
        onSearch(value);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const sizeClasses = {
    sm: 'py-2 px-3 text-sm pl-9',
    md: 'py-3 px-4 text-base pl-11',
    lg: 'py-4 px-5 text-lg pl-14',
  };

  const iconSizeClasses = {
    sm: 'left-3 w-4 h-4',
    md: 'left-4 w-5 h-5',
    lg: 'left-5 w-6 h-6',
  };

  const showDropdown = isFocused && (suggestions.length > 0 || (value === '' && recentSearches.length > 0));

  return (
    <div
      ref={containerRef}
      className={clsx('relative', fullWidth && 'w-full', className)}
    >
      {/* Input */}
      <div className="relative">
        {/* Search icon */}
        <span className={clsx('absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none', iconSizeClasses[size])}>
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            icon || <Search />
          )}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={clsx(
            'w-full rounded-xl border border-gray-200 bg-white',
            'transition-all duration-200 ease-out',
            'placeholder-gray-400 text-gray-900',
            'focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500',
            'hover:border-gray-300 hover:bg-white',
            sizeClasses[size],
            clearable && value && 'pr-10'
          )}
        />

        {/* Clear button */}
        {clearable && value && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden animate-fadeIn">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((item, index) => (
                <li
                  key={item}
                  onClick={() => handleSelect(item)}
                  className={clsx(
                    'px-4 py-3 cursor-pointer transition-colors',
                    highlightIndex === index ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                  )}
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : recentSearches.length > 0 && value === '' ? (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                Recent Searches
              </div>
              <ul>
                {recentSearches.map((item, index) => (
                  <li
                    key={item}
                    onClick={() => handleSelect(item)}
                    className={clsx(
                      'px-4 py-3 cursor-pointer transition-colors flex items-center gap-2',
                      highlightIndex === index ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                    )}
                  >
                    <Search className="w-4 h-4 text-gray-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
