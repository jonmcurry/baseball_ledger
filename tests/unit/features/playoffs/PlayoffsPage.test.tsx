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
});
