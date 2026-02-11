/**
 * StatTable
 *
 * Generic sortable statistics table with monospace font alignment.
 * Supports loading state, empty state, row highlighting, and click handling.
 * Virtualizes large datasets (50+ rows) for performance (REQ-NFR-004).
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const VIRTUALIZATION_THRESHOLD = 50;
const ROW_HEIGHT = 32;

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
  const useVirtual = !isLoading && data.length > VIRTUALIZATION_THRESHOLD;

  return useVirtual ? (
    <VirtualizedTable
      columns={columns}
      data={data}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      onRowClick={onRowClick}
      highlightRowPredicate={highlightRowPredicate}
    />
  ) : (
    <SimpleTable
      columns={columns}
      data={data}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      onRowClick={onRowClick}
      emptyMessage={emptyMessage}
      isLoading={isLoading}
      highlightRowPredicate={highlightRowPredicate}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Simple (non-virtualized) table for small datasets + loading/empty states  */
/* -------------------------------------------------------------------------- */

function SimpleTable<T>({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  emptyMessage,
  isLoading,
  highlightRowPredicate,
}: StatTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-stat text-sm" role="grid">
        <thead>
          <HeaderRow columns={columns} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
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
            data.map((row, idx) => (
              <DataRow
                key={idx}
                row={row}
                columns={columns}
                onRowClick={onRowClick}
                isHighlighted={highlightRowPredicate?.(row) ?? false}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Virtualized table for large datasets (REQ-NFR-004)                        */
/* -------------------------------------------------------------------------- */

function VirtualizedTable<T>({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  highlightRowPredicate,
}: Omit<StatTableProps<T>, 'emptyMessage' | 'isLoading'>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      data-testid="stat-table-scroll"
      className="max-h-[600px] overflow-x-auto overflow-y-auto"
    >
      <table className="w-full font-stat text-sm" role="grid">
        <thead className="sticky top-0 z-10 bg-old-lace">
          <HeaderRow columns={columns} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
        </thead>
        <tbody>
          {/* Top spacer */}
          {virtualizer.getVirtualItems()[0]?.start > 0 && (
            <tr aria-hidden="true">
              <td
                colSpan={columns.length}
                style={{ height: virtualizer.getVirtualItems()[0].start }}
              />
            </tr>
          )}
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index];
            return (
              <DataRow
                key={virtualRow.index}
                row={row}
                columns={columns}
                onRowClick={onRowClick}
                isHighlighted={highlightRowPredicate?.(row) ?? false}
              />
            );
          })}
          {/* Bottom spacer */}
          {(() => {
            const items = virtualizer.getVirtualItems();
            const lastItem = items[items.length - 1];
            const remaining = lastItem
              ? virtualizer.getTotalSize() - lastItem.end
              : 0;
            return remaining > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={columns.length} style={{ height: remaining }} />
              </tr>
            ) : null;
          })()}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared sub-components                                                      */
/* -------------------------------------------------------------------------- */

function HeaderRow<T>({
  columns,
  sortBy,
  sortOrder,
  onSort,
}: {
  columns: StatColumn<T>[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
}) {
  return (
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
                : 'none'
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
  );
}

function DataRow<T>({
  row,
  columns,
  onRowClick,
  isHighlighted,
}: {
  row: T;
  columns: StatColumn<T>[];
  onRowClick?: (row: T) => void;
  isHighlighted: boolean;
}) {
  return (
    <tr
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

export default StatTable;
