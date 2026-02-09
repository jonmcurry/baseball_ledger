// @vitest-environment jsdom
/**
 * Tests for StandingsPage
 *
 * Mocks useLeague hook to isolate page rendering.
 */

import { render, screen } from '@testing-library/react';
import { StandingsPage } from '@features/standings/StandingsPage';
import { createMockStandings } from '../../../../tests/fixtures/mock-league';

vi.mock('@hooks/useLeague', () => ({
  useLeague: vi.fn(),
}));

import { useLeague } from '@hooks/useLeague';

const mockUseLeague = vi.mocked(useLeague);

describe('StandingsPage', () => {
  beforeEach(() => {
    mockUseLeague.mockReturnValue({
      league: null,
      teams: [],
      standings: createMockStandings(),
      schedule: [],
      currentDay: 0,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'regular_season',
    });
  });

  it('shows loading state', () => {
    mockUseLeague.mockReturnValue({
      league: null,
      teams: [],
      standings: [],
      schedule: [],
      currentDay: 0,
      isLoading: true,
      error: null,
      isCommissioner: false,
      leagueStatus: null,
    });

    render(<StandingsPage />);
    expect(screen.getByText('Loading standings...')).toBeInTheDocument();
  });

  it('renders page heading', () => {
    render(<StandingsPage />);
    expect(screen.getByText('Standings')).toBeInTheDocument();
  });

  it('renders division standings', () => {
    render(<StandingsPage />);
    expect(screen.getByText(/AL East/)).toBeInTheDocument();
    expect(screen.getByText(/AL West/)).toBeInTheDocument();
    expect(screen.getByText(/NL East/)).toBeInTheDocument();
    expect(screen.getByText(/NL West/)).toBeInTheDocument();
  });

  it('shows error banner when error exists', () => {
    mockUseLeague.mockReturnValue({
      league: null,
      teams: [],
      standings: createMockStandings(),
      schedule: [],
      currentDay: 0,
      isLoading: false,
      error: 'Failed to load standings',
      isCommissioner: false,
      leagueStatus: 'regular_season',
    });

    render(<StandingsPage />);
    expect(screen.getByText('Failed to load standings')).toBeInTheDocument();
  });

  it('does not show error banner when no error', () => {
    render(<StandingsPage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders team names from standings', () => {
    render(<StandingsPage />);
    expect(screen.getByText('Eagles')).toBeInTheDocument();
    expect(screen.getByText('Hawks')).toBeInTheDocument();
    expect(screen.getByText('Wolves')).toBeInTheDocument();
  });
});
