// @vitest-environment jsdom
/**
 * Tests for StandingsTable component
 *
 * Division standings with win pct, games behind, and user team highlight.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StandingsTable } from '@components/data-display/StandingsTable';
import type { DivisionStandings } from '@lib/types/league';

function makeStandings(): DivisionStandings[] {
  return [
    {
      leagueDivision: 'AL',
      division: 'East',
      teams: [
        {
          id: 'nyy',
          name: 'Yankees',
          city: 'New York',
          ownerId: 'user-1',
          managerProfile: 'balanced',
          leagueDivision: 'AL',
          division: 'East',
          wins: 95,
          losses: 67,
          runsScored: 800,
          runsAllowed: 650,
          homeWins: 0,
          homeLosses: 0,
          awayWins: 0,
          awayLosses: 0,
          streak: '-',
          lastTenWins: 0,
          lastTenLosses: 0,
        },
        {
          id: 'bos',
          name: 'Red Sox',
          city: 'Boston',
          ownerId: null,
          managerProfile: 'aggressive',
          leagueDivision: 'AL',
          division: 'East',
          wins: 88,
          losses: 74,
          runsScored: 720,
          runsAllowed: 700,
          homeWins: 0,
          homeLosses: 0,
          awayWins: 0,
          awayLosses: 0,
          streak: '-',
          lastTenWins: 0,
          lastTenLosses: 0,
        },
      ],
    },
    {
      leagueDivision: 'AL',
      division: 'West',
      teams: [
        {
          id: 'laa',
          name: 'Angels',
          city: 'Los Angeles',
          ownerId: null,
          managerProfile: 'balanced',
          leagueDivision: 'AL',
          division: 'West',
          wins: 80,
          losses: 82,
          runsScored: 680,
          runsAllowed: 710,
          homeWins: 0,
          homeLosses: 0,
          awayWins: 0,
          awayLosses: 0,
          streak: '-',
          lastTenWins: 0,
          lastTenLosses: 0,
        },
      ],
    },
  ];
}

describe('StandingsTable', () => {
  it('renders division headers', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/AL East/)).toBeInTheDocument();
    expect(screen.getByText(/AL West/)).toBeInTheDocument();
  });

  it('renders team names', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    expect(screen.getByText('Yankees')).toBeInTheDocument();
    expect(screen.getByText('Red Sox')).toBeInTheDocument();
    expect(screen.getByText('Angels')).toBeInTheDocument();
  });

  it('renders W, L columns', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('67')).toBeInTheDocument();
  });

  it('renders PCT column with computed win percentage', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    // Yankees: 95/(95+67) = .586
    expect(screen.getByText('.586')).toBeInTheDocument();
  });

  it('renders GB column', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    // Red Sox: GB = ((95-88) + (74-67))/2 = 7.0
    expect(screen.getByText('7.0')).toBeInTheDocument();
    // Leader Yankees has GB of '-', find it within Yankees row
    const yankeeRow = screen.getByText('Yankees').closest('tr')!;
    const gbCell = yankeeRow.querySelectorAll('td')[4]; // Team, W, L, PCT, GB
    expect(gbCell.textContent).toBe('-');
  });

  it('renders run differential columns', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    // Yankees RS=800, RA=650, DIFF=+150
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('650')).toBeInTheDocument();
  });

  it('highlights user team row', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    const yankeeRow = screen.getByText('Yankees').closest('tr');
    expect(yankeeRow?.className).toContain('bg-sandstone/30');
  });

  it('does not highlight non-user team rows', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    const soxRow = screen.getByText('Red Sox').closest('tr');
    // Non-user rows should not have the bg-sandstone/30 highlight class
    expect(soxRow?.className).not.toContain('bg-sandstone/30');
  });

  it('calls onTeamClick with team id when team is clicked', async () => {
    const user = userEvent.setup();
    const onTeamClick = vi.fn();
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={onTeamClick}
      />,
    );

    await user.click(screen.getByText('Red Sox'));
    expect(onTeamClick).toHaveBeenCalledWith('bos');
  });

  it('handles empty standings array', () => {
    render(
      <StandingsTable standings={[]} userTeamId="nyy" onTeamClick={vi.fn()} />,
    );
    // Should render without error
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
