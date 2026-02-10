// @vitest-environment jsdom
/**
 * Tests for PlayoffsPage
 *
 * Verifies:
 * - Loading state
 * - Not-started message for non-playoff status
 * - AL/NL bracket + WS rendering from persisted bracket
 * - Champion banner when worldSeriesChampionId is set
 * - Bracket-not-set message when playoffs active but no bracket
 */

import { render, screen } from '@testing-library/react';
import { PlayoffsPage } from '@features/playoffs/PlayoffsPage';
import type { FullPlayoffBracket } from '@lib/types/schedule';

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

function buildMockBracket(): FullPlayoffBracket {
  return {
    leagueId: 'league-1',
    al: { leagueId: 'league-1', rounds: [], championId: null },
    nl: { leagueId: 'league-1', rounds: [], championId: null },
    worldSeries: {
      id: 'ws-0', round: 'WorldSeries',
      leagueDivision: 'MLB', higherSeed: null, lowerSeed: null,
      bestOf: 7, games: [], higherSeedWins: 0, lowerSeedWins: 0,
      isComplete: false, winnerId: null,
    },
    worldSeriesChampionId: null,
  };
}

describe('PlayoffsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLeague.mockReturnValue({
      league: { id: 'league-1', status: 'regular_season' },
      teams: [],
      standings: [],
      playoffBracket: null,
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

  it('shows loading state', () => {
    mockUseLeague.mockReturnValue({
      league: null,
      teams: [],
      standings: [],
      playoffBracket: null,
      isLoading: true,
      error: null,
      leagueStatus: null,
    });
    render(<PlayoffsPage />);
    expect(screen.getByText('Loading playoffs...')).toBeInTheDocument();
  });

  it('renders AL and NL bracket sections when playoffs active with bracket', () => {
    mockUseLeague.mockReturnValue({
      league: { id: 'league-1', status: 'playoffs' },
      teams: [],
      standings: [],
      playoffBracket: buildMockBracket(),
      isLoading: false,
      error: null,
      leagueStatus: 'playoffs',
    });
    render(<PlayoffsPage />);
    expect(screen.getByText('American League')).toBeInTheDocument();
    expect(screen.getByText('National League')).toBeInTheDocument();
    expect(screen.getByText('World Series')).toBeInTheDocument();
  });

  it('shows bracket-not-set message when playoffs active but no bracket', () => {
    mockUseLeague.mockReturnValue({
      league: { id: 'league-1', status: 'playoffs' },
      teams: [],
      standings: [],
      playoffBracket: null,
      isLoading: false,
      error: null,
      leagueStatus: 'playoffs',
    });
    render(<PlayoffsPage />);
    expect(screen.getByText('Playoff bracket has not been set.')).toBeInTheDocument();
  });

  it('shows champion banner when worldSeriesChampionId is set', () => {
    const bracket = buildMockBracket();
    bracket.worldSeriesChampionId = 'team-1';

    mockUseLeague.mockReturnValue({
      league: { id: 'league-1', status: 'completed' },
      teams: [{ id: 'team-1', name: 'Yankees', city: 'New York' }],
      standings: [],
      playoffBracket: bracket,
      isLoading: false,
      error: null,
      leagueStatus: 'completed',
    });
    render(<PlayoffsPage />);
    expect(screen.getByText('World Series Champion')).toBeInTheDocument();
    expect(screen.getByText('New York Yankees')).toBeInTheDocument();
  });

  it('renders bracket in completed status', () => {
    mockUseLeague.mockReturnValue({
      league: { id: 'league-1', status: 'completed' },
      teams: [],
      standings: [],
      playoffBracket: buildMockBracket(),
      isLoading: false,
      error: null,
      leagueStatus: 'completed',
    });
    render(<PlayoffsPage />);
    // Should still show brackets when completed
    expect(screen.getByText('American League')).toBeInTheDocument();
    expect(screen.getByText('National League')).toBeInTheDocument();
  });

  it('shows error banner when error present', () => {
    mockUseLeague.mockReturnValue({
      league: { id: 'league-1', status: 'playoffs' },
      teams: [],
      standings: [],
      playoffBracket: buildMockBracket(),
      isLoading: false,
      error: 'Something went wrong',
      leagueStatus: 'playoffs',
    });
    render(<PlayoffsPage />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
