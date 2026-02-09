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
});
