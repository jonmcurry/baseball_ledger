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
});
