// @vitest-environment jsdom
/**
 * Tests for StatsPage
 *
 * Uses statsStore directly (not mocked) with fixture data.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatsPage } from '@features/stats/StatsPage';
import { useStatsStore } from '@stores/statsStore';
import { createMockBattingLeaders, createMockPitchingLeaders } from '../../../../tests/fixtures/mock-stats';

describe('StatsPage', () => {
  beforeEach(() => {
    useStatsStore.getState().reset();
  });

  it('shows loading state', () => {
    useStatsStore.getState().setLoading(true);

    render(<StatsPage />);
    expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
  });

  it('renders page heading', () => {
    render(<StatsPage />);
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  it('renders batting and pitching tabs', () => {
    render(<StatsPage />);
    expect(screen.getByRole('tab', { name: 'Batting' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pitching' })).toBeInTheDocument();
  });

  it('batting tab is selected by default', () => {
    render(<StatsPage />);
    const battingTab = screen.getByRole('tab', { name: 'Batting' });
    expect(battingTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders league filter buttons', () => {
    render(<StatsPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('NL')).toBeInTheDocument();
  });

  it('shows batting data in StatTable', () => {
    useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());

    render(<StatsPage />);
    // Should have AVG column header
    expect(screen.getByText('AVG')).toBeInTheDocument();
  });

  it('switches to pitching tab', async () => {
    const user = userEvent.setup();
    useStatsStore.getState().setPitchingLeaders(createMockPitchingLeaders());

    render(<StatsPage />);
    await user.click(screen.getByRole('tab', { name: 'Pitching' }));

    const pitchingTab = screen.getByRole('tab', { name: 'Pitching' });
    expect(pitchingTab).toHaveAttribute('aria-selected', 'true');
    // Should have ERA column header
    expect(screen.getByText('ERA')).toBeInTheDocument();
  });

  it('filters by AL league', async () => {
    const user = userEvent.setup();
    useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());

    render(<StatsPage />);
    await user.click(screen.getByText('AL'));

    // NL player (p-3) should not be visible; AL players (p-1, p-2) remain
    // 3 total leaders, 2 are AL, 1 is NL
    // The table should show 2 data rows
    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody')!;
    const rows = tbody.querySelectorAll('tr');
    expect(rows).toHaveLength(2);
  });

  it('filters by NL league', async () => {
    const user = userEvent.setup();
    useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());

    render(<StatsPage />);
    await user.click(screen.getByText('NL'));

    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody')!;
    const rows = tbody.querySelectorAll('tr');
    expect(rows).toHaveLength(1);
  });

  it('shows error banner when error exists', () => {
    useStatsStore.getState().setError('Stats fetch failed');

    render(<StatsPage />);
    expect(screen.getByText('Stats fetch failed')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(<StatsPage />);
    expect(screen.getByText('No batting leaders available')).toBeInTheDocument();
  });

  it('renders stat view toggle button', () => {
    render(<StatsPage />);
    expect(screen.getByLabelText('Toggle stat view')).toBeInTheDocument();
  });

  it('toggle shows "Advanced" label in traditional view (default)', () => {
    render(<StatsPage />);
    expect(screen.getByLabelText('Toggle stat view')).toHaveTextContent('Advanced');
  });

  it('clicking toggle switches to advanced view with OPS column', async () => {
    const user = userEvent.setup();
    useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());

    render(<StatsPage />);
    await user.click(screen.getByLabelText('Toggle stat view'));

    // Advanced batting view should show OPS column
    expect(screen.getByText('OPS')).toBeInTheDocument();
    // Toggle label should now say "Traditional"
    expect(screen.getByLabelText('Toggle stat view')).toHaveTextContent('Traditional');
  });

  it('clicking toggle twice returns to traditional view', async () => {
    const user = userEvent.setup();
    useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());

    render(<StatsPage />);
    await user.click(screen.getByLabelText('Toggle stat view'));
    await user.click(screen.getByLabelText('Toggle stat view'));

    // Back to traditional: should have RBI column but not OPS
    expect(screen.getByText('RBI')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle stat view')).toHaveTextContent('Advanced');
  });

  describe('sorting', () => {
    function getDataRows(): HTMLElement[] {
      const table = screen.getByRole('table');
      const tbody = table.querySelector('tbody')!;
      return Array.from(tbody.querySelectorAll('tr'));
    }

    function getFirstColumnValues(): string[] {
      return getDataRows().map((row) => {
        const cells = row.querySelectorAll('td');
        return cells[0]?.textContent ?? '';
      });
    }

    it('sorts batting by BA descending by default', () => {
      useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());
      render(<StatsPage />);

      // BA: p-1=.333, p-2=.328, p-3=.321 => desc order: p-1, p-2, p-3
      const playerIds = getFirstColumnValues();
      expect(playerIds).toEqual(['p-1', 'p-2', 'p-3']);
    });

    it('clicking HR column sorts by HR descending', async () => {
      const user = userEvent.setup();
      useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());
      render(<StatsPage />);

      await user.click(screen.getByText('HR'));

      // HR: p-1=40, p-2=35, p-3=30 => desc order: p-1, p-2, p-3
      const playerIds = getFirstColumnValues();
      expect(playerIds).toEqual(['p-1', 'p-2', 'p-3']);
    });

    it('clicking same column toggles sort direction', async () => {
      const user = userEvent.setup();
      useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());
      render(<StatsPage />);

      // Default is BA desc. Click AVG (which maps to BA key) to toggle to asc.
      const avgHeader = screen.getByText('AVG');
      await user.click(avgHeader);

      // BA asc: p-3=.321, p-2=.328, p-1=.333
      const playerIds = getFirstColumnValues();
      expect(playerIds).toEqual(['p-3', 'p-2', 'p-1']);
    });

    it('shows sort indicator on active column', () => {
      useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());
      render(<StatsPage />);

      // BA is default sort column, AVG header should have aria-sort
      const avgHeader = screen.getByText('AVG').closest('th');
      expect(avgHeader).toHaveAttribute('aria-sort', 'descending');
    });

    it('ERA column defaults to ascending sort', async () => {
      const user = userEvent.setup();
      useStatsStore.getState().setPitchingLeaders(createMockPitchingLeaders());
      render(<StatsPage />);

      await user.click(screen.getByRole('tab', { name: 'Pitching' }));
      await user.click(screen.getByText('ERA'));

      // ERA header should be ascending
      const eraHeader = screen.getByText('ERA').closest('th');
      expect(eraHeader).toHaveAttribute('aria-sort', 'ascending');

      // ERA: pp-1=1.80, pp-2=2.45, pp-3=3.09 => asc order: pp-1, pp-2, pp-3
      const playerIds = getFirstColumnValues();
      expect(playerIds).toEqual(['pp-1', 'pp-2', 'pp-3']);
    });
  });
});
