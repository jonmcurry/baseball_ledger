// @vitest-environment jsdom
/**
 * Tests for GameViewerPage
 */

import { render, screen } from '@testing-library/react';
import { GameViewerPage } from '@features/game-viewer/GameViewerPage';

const { mockUseParams } = vi.hoisted(() => {
  const mockUseParams = vi.fn().mockReturnValue({ gameId: 'game-1' });
  return { mockUseParams };
});

vi.mock('react-router-dom', () => ({
  useParams: mockUseParams,
}));

vi.mock('@hooks/useLeague', () => ({
  useLeague: vi.fn().mockReturnValue({
    league: { id: 'league-1' },
    teams: [
      { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'u-1' },
      { id: 'team-2', city: 'Boston', name: 'Red Sox', ownerId: 'u-2' },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@stores/simulationStore', () => ({
  useSimulationStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      results: [
        {
          gameId: 'game-1',
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          homeScore: 4,
          awayScore: 3,
        },
      ],
    }),
  ),
}));

describe('GameViewerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ gameId: 'game-1' });
  });

  it('renders page heading with team names', () => {
    render(<GameViewerPage />);
    expect(screen.getByText(/Boston Red Sox @ New York Yankees/)).toBeInTheDocument();
  });

  it('shows score', () => {
    render(<GameViewerPage />);
    expect(screen.getByText('3 - 4')).toBeInTheDocument();
  });

  it('shows game not found when gameId has no result', () => {
    mockUseParams.mockReturnValue({ gameId: 'nonexistent' });
    render(<GameViewerPage />);
    expect(screen.getByText('Game Not Found')).toBeInTheDocument();
  });

  it('shows warning when no gameId provided', () => {
    mockUseParams.mockReturnValue({});
    render(<GameViewerPage />);
    expect(screen.getByText('No game ID provided.')).toBeInTheDocument();
  });

  it('renders game state panel', () => {
    render(<GameViewerPage />);
    expect(screen.getByText('Game State')).toBeInTheDocument();
  });
});
