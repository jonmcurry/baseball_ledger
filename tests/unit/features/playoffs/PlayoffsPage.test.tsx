// @vitest-environment jsdom
/**
 * Tests for PlayoffsPage
 */

import { render, screen } from '@testing-library/react';
import { PlayoffsPage } from '@features/playoffs/PlayoffsPage';

const { mockUseLeague } = vi.hoisted(() => {
  const mockUseLeague = vi.fn();
  return { mockUseLeague };
});

vi.mock('@hooks/useLeague', () => ({
  useLeague: mockUseLeague,
}));

vi.mock('@hooks/usePostseasonTheme', () => ({
  usePostseasonTheme: vi.fn(),
}));

describe('PlayoffsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLeague.mockReturnValue({
      league: { id: 'league-1', status: 'regular_season' },
      teams: [],
      standings: [],
      isLoading: false,
      error: null,
      leagueStatus: 'regular_season',
    });
  });

  it('renders page heading', () => {
    render(<PlayoffsPage />);
    expect(screen.getByText('Playoffs')).toBeInTheDocument();
  });

  it('shows not started message when not in playoffs', () => {
    render(<PlayoffsPage />);
    expect(screen.getByText('Playoffs Not Started')).toBeInTheDocument();
  });

  it('shows bracket when playoffs are active', () => {
    mockUseLeague.mockReturnValue({
      league: { id: 'league-1', status: 'playoffs' },
      teams: [],
      standings: [],
      isLoading: false,
      error: null,
      leagueStatus: 'playoffs',
    });
    render(<PlayoffsPage />);
    expect(screen.getByText('Playoff Bracket')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseLeague.mockReturnValue({
      league: null,
      teams: [],
      standings: [],
      isLoading: true,
      error: null,
      leagueStatus: null,
    });
    render(<PlayoffsPage />);
    expect(screen.getByText('Loading playoffs...')).toBeInTheDocument();
  });

  it('generates bracket from standings when playoffs active', () => {
    const standings = [
      {
        leagueDivision: 'AL',
        divisionName: 'East',
        teams: [
          { id: 't1', name: 'Yankees', city: 'NY', ownerId: 'u1', wins: 95, losses: 67, runsScored: 800, runsAllowed: 700 },
          { id: 't2', name: 'Red Sox', city: 'BOS', ownerId: 'u2', wins: 90, losses: 72, runsScored: 750, runsAllowed: 720 },
        ],
      },
      {
        leagueDivision: 'AL',
        divisionName: 'Central',
        teams: [
          { id: 't3', name: 'Guardians', city: 'CLE', ownerId: 'u3', wins: 88, losses: 74, runsScored: 730, runsAllowed: 710 },
          { id: 't4', name: 'Twins', city: 'MIN', ownerId: 'u4', wins: 85, losses: 77, runsScored: 700, runsAllowed: 730 },
        ],
      },
      {
        leagueDivision: 'AL',
        divisionName: 'West',
        teams: [
          { id: 't5', name: 'Astros', city: 'HOU', ownerId: 'u5', wins: 92, losses: 70, runsScored: 780, runsAllowed: 690 },
          { id: 't6', name: 'Rangers', city: 'TEX', ownerId: 'u6', wins: 82, losses: 80, runsScored: 700, runsAllowed: 750 },
        ],
      },
    ];

    mockUseLeague.mockReturnValue({
      league: { id: 'league-1', status: 'playoffs' },
      teams: [
        { id: 't1', name: 'Yankees', city: 'NY', ownerId: 'u1' },
        { id: 't2', name: 'Red Sox', city: 'BOS', ownerId: 'u2' },
      ],
      standings,
      isLoading: false,
      error: null,
      leagueStatus: 'playoffs',
    });

    render(<PlayoffsPage />);
    // Should have bracket rounds generated from standings
    expect(screen.getByText('Playoff Bracket')).toBeInTheDocument();
    // Should not show the "not set" message since there are rounds
    expect(screen.queryByText('Playoff bracket has not been set.')).not.toBeInTheDocument();
  });
});
