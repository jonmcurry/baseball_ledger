// @vitest-environment jsdom
/**
 * Tests for StatTable component
 *
 * Generic sortable statistics table with monospace font alignment.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatTable, type StatColumn } from '@components/data-display/StatTable';

interface TestRow {
  id: string;
  name: string;
  avg: number;
  hr: number;
}

const columns: StatColumn<TestRow>[] = [
  { key: 'name', header: 'Name', getValue: (r) => r.name },
  { key: 'avg', header: 'AVG', getValue: (r) => r.avg.toFixed(3), numeric: true },
  { key: 'hr', header: 'HR', getValue: (r) => r.hr, numeric: true },
];

const sampleData: TestRow[] = [
  { id: '1', name: 'Aaron', avg: 0.305, hr: 44 },
  { id: '2', name: 'Mays', avg: 0.302, hr: 52 },
  { id: '3', name: 'Ruth', avg: 0.342, hr: 60 },
];

describe('StatTable', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('renders column headers', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('AVG')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();
  });

  it('renders all data rows', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    expect(screen.getByText('Aaron')).toBeInTheDocument();
    expect(screen.getByText('Mays')).toBeInTheDocument();
    expect(screen.getByText('Ruth')).toBeInTheDocument();
  });

  it('renders getValue output for each cell', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    expect(screen.getByText('0.305')).toBeInTheDocument();
    expect(screen.getByText('44')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  it('marks sorted column header with aria-sort', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    const hrHeader = screen.getByText('HR').closest('th');
    expect(hrHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('sets aria-sort="ascending" for asc order', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="avg"
        sortOrder="asc"
        onSort={vi.fn()}
      />,
    );
    const avgHeader = screen.getByText('AVG').closest('th');
    expect(avgHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('does not set aria-sort on non-sorted columns', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).not.toHaveAttribute('aria-sort');
  });

  it('calls onSort with column key when header is clicked', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={onSort}
      />,
    );

    await user.click(screen.getByText('AVG'));
    expect(onSort).toHaveBeenCalledWith('avg');
  });

  // ---------------------------------------------------------------------------
  // Empty state and loading
  // ---------------------------------------------------------------------------

  it('shows empty message when data is empty', () => {
    render(
      <StatTable
        columns={columns}
        data={[]}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
        emptyMessage="No players found"
      />,
    );
    expect(screen.getByText('No players found')).toBeInTheDocument();
  });

  it('shows default empty message when none provided', () => {
    render(
      <StatTable
        columns={columns}
        data={[]}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('shows loading shimmer when isLoading is true', () => {
    render(
      <StatTable
        columns={columns}
        data={[]}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
        isLoading
      />,
    );
    const table = screen.getByRole('table');
    expect(table.querySelectorAll('[data-loading-row]').length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Row interaction
  // ---------------------------------------------------------------------------

  it('calls onRowClick with row data when row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
        onRowClick={onRowClick}
      />,
    );

    await user.click(screen.getByText('Aaron'));
    expect(onRowClick).toHaveBeenCalledWith(sampleData[0]);
  });

  it('applies highlight to rows matching predicate', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
        highlightRowPredicate={(row) => row.name === 'Ruth'}
      />,
    );
    const ruthRow = screen.getByText('Ruth').closest('tr');
    expect(ruthRow?.className).toContain('sandstone');
  });

  // ---------------------------------------------------------------------------
  // Styling
  // ---------------------------------------------------------------------------

  it('uses font-stat class on table', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    expect(screen.getByRole('table').className).toContain('font-stat');
  });

  it('right-aligns numeric columns', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    const hrHeader = screen.getByText('HR').closest('th');
    expect(hrHeader?.className).toContain('text-right');
  });

  // ---------------------------------------------------------------------------
  // Virtualization (REQ-NFR-004)
  // ---------------------------------------------------------------------------

  it('renders all rows for small datasets (below virtualization threshold)', () => {
    render(
      <StatTable
        columns={columns}
        data={sampleData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    // 1 header row + 3 data rows
    expect(rows).toHaveLength(4);
  });

  it('uses scroll container for large datasets', () => {
    const largeData: TestRow[] = Array.from({ length: 600 }, (_, i) => ({
      id: `${i}`,
      name: `Player ${i}`,
      avg: 0.250 + Math.random() * 0.1,
      hr: Math.floor(Math.random() * 60),
    }));
    render(
      <StatTable
        columns={columns}
        data={largeData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    const scrollContainer = screen.getByTestId('stat-table-scroll');
    expect(scrollContainer).toBeInTheDocument();
  });

  it('does not render all 600 rows in the DOM for large datasets', () => {
    const largeData: TestRow[] = Array.from({ length: 600 }, (_, i) => ({
      id: `${i}`,
      name: `Player ${i}`,
      avg: 0.250,
      hr: i,
    }));
    render(
      <StatTable
        columns={columns}
        data={largeData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    const table = screen.getByRole('table');
    const dataRows = within(table).getAllByRole('row').filter(
      (row) => !row.querySelector('th') && !row.hasAttribute('data-loading-row'),
    );
    // Virtualized: should render far fewer than 600 rows
    expect(dataRows.length).toBeLessThan(100);
  });

  it('sort still works after virtualization on large datasets', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const largeData: TestRow[] = Array.from({ length: 200 }, (_, i) => ({
      id: `${i}`,
      name: `Player ${i}`,
      avg: 0.250,
      hr: i,
    }));
    render(
      <StatTable
        columns={columns}
        data={largeData}
        sortBy="hr"
        sortOrder="desc"
        onSort={onSort}
      />,
    );
    await user.click(screen.getByText('AVG'));
    expect(onSort).toHaveBeenCalledWith('avg');
  });

  it('virtualized table preserves table structure with thead and tbody', () => {
    const largeData: TestRow[] = Array.from({ length: 200 }, (_, i) => ({
      id: `${i}`,
      name: `Player ${i}`,
      avg: 0.250,
      hr: i,
    }));
    render(
      <StatTable
        columns={columns}
        data={largeData}
        sortBy="hr"
        sortOrder="desc"
        onSort={vi.fn()}
        onRowClick={vi.fn()}
      />,
    );
    const table = screen.getByRole('table');
    expect(table.querySelector('thead')).toBeInTheDocument();
    expect(table.querySelector('tbody')).toBeInTheDocument();
    // Header has sticky class for scroll context
    expect(table.querySelector('thead')?.className).toContain('sticky');
  });
});
