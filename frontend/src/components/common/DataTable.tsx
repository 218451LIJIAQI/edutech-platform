import { ReactNode, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import clsx from 'clsx';

export interface Column<T> {
  /** Unique key for the column */
  key: string;
  /** Column header label */
  header: string;
  /** Cell renderer */
  render?: (row: T, index: number) => ReactNode;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Column width */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Data array */
  data: T[];
  /** Unique key field in data */
  keyField?: keyof T;
  /** Whether table is loading */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Whether to show search */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Callback when row is clicked */
  onRowClick?: (row: T, index: number) => void;
  /** Whether rows are hoverable */
  hoverable?: boolean;
  /** Whether to show striped rows */
  striped?: boolean;
  /** Additional className */
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

/**
 * DataTable Component
 * Feature-rich data table with sorting and search
 * 
 * @example
 * <DataTable
 *   columns={[
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'email', header: 'Email' },
 *     { key: 'role', header: 'Role', render: (row) => <Badge>{row.role}</Badge> },
 *     { key: 'actions', header: '', render: (row) => <button>Edit</button>, align: 'right' }
 *   ]}
 *   data={users}
 *   keyField="id"
 *   searchable
 *   hoverable
 *   onRowClick={(row) => console.log(row)}
 * />
 */
function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = 'id' as keyof T,
  loading = false,
  emptyMessage = 'No data available',
  searchable = false,
  searchPlaceholder = 'Search...',
  onRowClick,
  hoverable = true,
  striped = false,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = row[col.key];
          return value?.toString().toLowerCase().includes(query);
        })
      );
    }

    // Sort
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, columns, searchQuery, sortKey, sortDirection]);

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={clsx('bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden', className)}>
      {/* Search */}
      {searchable && (
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/80">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100',
                    alignClasses[col.align || 'left'],
                    col.sortable && 'cursor-pointer select-none hover:text-gray-700'
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={clsx('flex items-center gap-2', col.align === 'right' && 'justify-end')}>
                    {col.header}
                    {col.sortable && (
                      <span className="text-gray-400">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-4 h-4 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading skeleton
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : processedData.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Data rows
              processedData.map((row, rowIndex) => (
                <tr
                  key={String(row[keyField]) || rowIndex}
                  onClick={() => onRowClick?.(row, rowIndex)}
                  className={clsx(
                    'border-b border-gray-50 last:border-b-0 transition-colors duration-150',
                    hoverable && 'hover:bg-gray-50/50',
                    onRowClick && 'cursor-pointer',
                    striped && rowIndex % 2 === 1 && 'bg-gray-50/30'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-6 py-4 text-sm text-gray-700',
                        alignClasses[col.align || 'left']
                      )}
                    >
                      {col.render ? col.render(row, rowIndex) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
