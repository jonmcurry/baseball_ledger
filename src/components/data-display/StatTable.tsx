/**
 * StatTable
 *
 * Generic sortable statistics table with monospace font alignment.
 * Supports loading state, empty state, row highlighting, and click handling.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export interface StatColumn<T> {
  key: string;
  header: string;
  getValue: (row: T) => string | number;
  numeric?: boolean;
}

export interface StatTableProps<T> {
  columns: StatColumn<T>[];
  data: readonly T[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (columnKey: string) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  highlightRowPredicate?: (row: T) => boolean;
}

export function StatTable<T>({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  emptyMessage = 'No data available',
  isLoading = false,
  highlightRowPredicate,
}: StatTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-stat text-sm" role="table">
        <thead>
          <tr className="border-b-2 border-sandstone text-ink">
            {columns.map((col) => {
              const isSorted = sortBy === col.key;
              return (
                <th
                  key={col.key}
                  aria-sort={
                    isSorted
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  onClick={() => onSort(col.key)}
                  className={`cursor-pointer select-none px-2 py-1.5 font-medium hover:bg-sandstone/20 ${
                    col.numeric ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.header}
                  {isSorted && (
                    <span aria-hidden="true" className="ml-1">
                      {sortOrder === 'asc' ? '\u25B2' : '\u25BC'}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading && renderLoadingRows(columns.length)}
          {!isLoading && data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="py-gutter-lg text-center text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          {!isLoading &&
            data.map((row, idx) => {
              const isHighlighted = highlightRowPredicate?.(row) ?? false;
              return (
                <tr
                  key={idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-sandstone/50 ${
                    onRowClick ? 'cursor-pointer hover:bg-sandstone/20' : ''
                  } ${isHighlighted ? 'bg-sandstone/30' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-2 py-1 ${col.numeric ? 'text-right' : 'text-left'}`}
                    >
                      {col.getValue(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

function renderLoadingRows(colCount: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <tr key={`loading-${i}`} data-loading-row="">
      {Array.from({ length: colCount }, (_, j) => (
        <td key={j} className="px-2 py-1">
          <div className="h-4 animate-pulse rounded bg-sandstone/40" />
        </td>
      ))}
    </tr>
  ));
}
