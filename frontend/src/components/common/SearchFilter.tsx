import { ChangeEvent, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  name: string;
  label: string;
  options: FilterOption[];
}

interface SearchFilterProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  filters?: FilterConfig[];
  onFilterChange?: (filters: Record<string, string>) => void;
  initialFilters?: Record<string, string>;
  debounceMs?: number;
}

const safelyParseFilters = (serializedFilters: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(serializedFilters) as Record<string, unknown>;

    return Object.entries(parsed).reduce<Record<string, string>>((accumulator, [key, value]) => {
      if (typeof value === 'string' && value.trim() !== '') {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});
  } catch {
    return {};
  }
};

/**
 * SearchFilter Component
 * Provides a reusable search input with optional filter dropdowns and active filter chips.
 */
const SearchFilter = ({
  placeholder = 'Search...',
  onSearch,
  filters = [],
  onFilterChange,
  initialFilters = {},
  debounceMs = 300,
}: SearchFilterProps) => {
  const searchInputId = useId();
  const filterPanelId = useId();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>(() => ({
    ...initialFilters,
  }));
  const [showFilters, setShowFilters] = useState(false);

  const serializedInitialFilters = JSON.stringify(initialFilters);

  useEffect(() => {
    setSelectedFilters(safelyParseFilters(serializedInitialFilters));
  }, [serializedInitialFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearch(searchQuery.trim());
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [searchQuery, debounceMs, onSearch]);

  const filterMap = useMemo(() => {
    return new Map(filters.map((filter) => [filter.name, filter]));
  }, [filters]);

  const activeFilterEntries = useMemo(() => {
    return Object.entries(selectedFilters).filter(([, value]) => value.trim() !== '');
  }, [selectedFilters]);

  const activeFilterCount = activeFilterEntries.length;

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleFilterChange = useCallback(
    (filterName: string, value: string) => {
      const nextFilters = { ...selectedFilters };

      if (value === '') {
        delete nextFilters[filterName];
      } else {
        nextFilters[filterName] = value;
      }

      setSelectedFilters(nextFilters);
      onFilterChange?.(nextFilters);
    },
    [selectedFilters, onFilterChange],
  );

  const clearFilters = () => {
    setSelectedFilters({});
    onFilterChange?.({});
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            Search
          </label>

          <Search
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />

          <input
            id={searchInputId}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={placeholder}
          />

          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {filters.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFilters((previous) => !previous)}
            aria-expanded={showFilters}
            aria-controls={filterPanelId}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-5 w-5" aria-hidden="true" />
            <span>Filters</span>

            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {showFilters && filters.length > 0 && (
        <div id={filterPanelId} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Filter Options</h3>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filters.map((filter) => {
              const selectId = `${filterPanelId}-${filter.name}`;

              return (
                <div key={filter.name}>
                  <label htmlFor={selectId} className="mb-2 block text-sm font-medium text-gray-700">
                    {filter.label}
                  </label>

                  <select
                    id={selectId}
                    value={selectedFilters[filter.name] || ''}
                    onChange={(event) => handleFilterChange(filter.name, event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All</option>

                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="text-sm text-gray-600">Active filters:</span>

          {activeFilterEntries.map(([filterName, value]) => {
            const filter = filterMap.get(filterName);
            const option = filter?.options.find((item) => item.value === value);
            const filterLabel = filter?.label || filterName;
            const optionLabel = option?.label || value;

            return (
              <span
                key={filterName}
                className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-800"
              >
                <span className="font-medium">{filterLabel}:</span>
                <span className="ml-1">{optionLabel}</span>

                <button
                  type="button"
                  onClick={() => handleFilterChange(filterName, '')}
                  className="ml-2 text-primary-600 hover:text-primary-800"
                  aria-label={`Remove ${filterLabel} filter`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchFilter;