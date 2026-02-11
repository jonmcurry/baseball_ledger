/**
 * Pagination
 *
 * Previous/Next page navigation with boundary disabling.
 * Uses font-stat for page number display.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isDisabled?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isDisabled = false,
}: PaginationProps) {
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-gutter py-3"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirst || isDisabled}
        aria-label="Previous page"
        className="rounded-button border border-sandstone px-3 py-1 text-sm text-ink hover:bg-sandstone/30 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="font-stat text-sm text-ink" aria-current="page">
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLast || isDisabled}
        aria-label="Next page"
        className="rounded-button border border-sandstone px-3 py-1 text-sm text-ink hover:bg-sandstone/30 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </nav>
  );
}

export default Pagination;
