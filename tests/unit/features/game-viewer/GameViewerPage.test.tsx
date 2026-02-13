// @vitest-environment jsdom
/**
 * Tests for GameViewerPage
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameViewerPage } from '@features/game-viewer/GameViewerPage';

const { mockUseParams } = vi.hoisted(() => {
  const mockUseParams = vi.fn().mockReturnValue({ gameId: 'game-1', leagueId: 'league-1' });
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

const { mockUseWorkerSimulation } = vi.hoisted(() => {
  const mockUseWorkerSimulation = vi.fn();
  return { mockUseWorkerSimulation };
});

vi.mock('@hooks/useWorkerSimulation', () => ({
  useWorkerSimulation: mockUseWorkerSimulation,
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

const { mockApiGet } = vi.hoisted(() => {
  const mockApiGet = vi.fn();
  return { mockApiGet };
});

vi.mock('@services/api-client', () => ({
  apiGet: mockApiGet,
}));

describe('GameViewerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ gameId: 'game-1', leagueId: 'league-1' });
    mockApiGet.mockRejectedValue(new Error('Not found'));
    mockUseWorkerSimulation.mockReturnValue({
      status: 'idle',
      result: null,
      error: null,
      simulateGame: vi.fn(),
      reset: vi.fn(),
    });
  });

  it('renders page heading with team names', () => {
    render(<GameViewerPage />);
    expect(screen.getByText(/Boston Red Sox @ New York Yankees/)).toBeInTheDocument();
  });

  it('shows score', () => {
    render(<GameViewerPage />);
    expect(screen.getByText('3 - 4')).toBeInTheDocument();
  });

  it('shows error when gameId has no result in store or DB', async () => {
    mockUseParams.mockReturnValue({ gameId: 'nonexistent', leagueId: 'league-1' });
    render(<GameViewerPage />);
    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });
  });

  it('shows game not found when DB returns no data and no error', async () => {
    mockUseParams.mockReturnValue({ gameId: 'nonexistent', leagueId: 'league-1' });
    mockApiGet.mockResolvedValue({ data: null });
    render(<GameViewerPage />);
    await waitFor(() => {
      expect(screen.getByText('Game Not Found')).toBeInTheDocument();
    });
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

  // ---------------------------------------------------------------------------
  // Worker simulation display (REQ-NFR-008)
  // ---------------------------------------------------------------------------

  it('shows progress when worker simulation is running', () => {
    mockUseWorkerSimulation.mockReturnValue({
      status: 'running',
      result: null,
      error: null,
      simulateGame: vi.fn(),
      reset: vi.fn(),
    });

    render(<GameViewerPage />);
    expect(screen.getByText('Simulating replay...')).toBeInTheDocument();
  });

  it('shows error when worker simulation fails', () => {
    mockUseWorkerSimulation.mockReturnValue({
      status: 'error',
      result: null,
      error: 'Worker crashed',
      simulateGame: vi.fn(),
      reset: vi.fn(),
    });

    render(<GameViewerPage />);
    expect(screen.getByText('Worker crashed')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Play-by-Play and Box Score Tabs (REQ-UI-010)
  // ---------------------------------------------------------------------------

  it('shows no detailed data message when no worker result', () => {
    render(<GameViewerPage />);
    expect(screen.getByText(/Detailed game data is not yet available/)).toBeInTheDocument();
  });

  it('renders Box Score and Play-by-Play tabs when worker has data', () => {
    mockUseWorkerSimulation.mockReturnValue({
      status: 'complete',
      result: {
        awayScore: 3,
        homeScore: 4,
        innings: 9,
        playByPlay: [
          {
            inning: 1,
            halfInning: 'top',
            outs: 0,
            batterId: 'p1',
            pitcherId: 'p2',
            cardPosition: 0,
            cardValue: 7,
            outcomeTableRow: 1,
            description: 'Single to left field',
            scoreAfter: { away: 0, home: 0 },
          },
        ],
        boxScore: { lineScore: { away: [1, 2], home: [3, 1] }, awayHits: 5, homeHits: 8, awayErrors: 0, homeErrors: 1 },
        playerBattingLines: [],
        playerPitchingLines: [],
        playerNames: {},
      },
      error: null,
      simulateGame: vi.fn(),
      reset: vi.fn(),
    });

    render(<GameViewerPage />);
    expect(screen.getByRole('tab', { name: 'Box Score' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Play-by-Play' })).toBeInTheDocument();
  });

  it('shows Box Score tab as active by default', () => {
    mockUseWorkerSimulation.mockReturnValue({
      status: 'complete',
      result: {
        awayScore: 3,
        homeScore: 4,
        innings: 9,
        playByPlay: [],
        boxScore: { lineScore: { away: [1, 2], home: [3, 1] }, awayHits: 5, homeHits: 8, awayErrors: 0, homeErrors: 1 },
        playerBattingLines: [],
        playerPitchingLines: [],
        playerNames: {},
      },
      error: null,
      simulateGame: vi.fn(),
      reset: vi.fn(),
    });

    render(<GameViewerPage />);
    const boxTab = screen.getByRole('tab', { name: 'Box Score' });
    expect(boxTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Play-by-Play tab on click', () => {
    mockUseWorkerSimulation.mockReturnValue({
      status: 'complete',
      result: {
        awayScore: 3,
        homeScore: 4,
        innings: 9,
        playByPlay: [
          {
            inning: 1,
            halfInning: 'top',
            outs: 0,
            batterId: 'p1',
            pitcherId: 'p2',
            cardPosition: 0,
            cardValue: 7,
            outcomeTableRow: 1,
            description: 'Single to left field',
            scoreAfter: { away: 0, home: 0 },
          },
        ],
        boxScore: { lineScore: { away: [1, 2], home: [3, 1] }, awayHits: 5, homeHits: 8, awayErrors: 0, homeErrors: 1 },
        playerBattingLines: [],
        playerPitchingLines: [],
        playerNames: {},
      },
      error: null,
      simulateGame: vi.fn(),
      reset: vi.fn(),
    });

    render(<GameViewerPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Play-by-Play' }));

    const pbpTab = screen.getByRole('tab', { name: 'Play-by-Play' });
    expect(pbpTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders PlayByPlayFeed when worker result has plays', () => {
    mockUseWorkerSimulation.mockReturnValue({
      status: 'complete',
      result: {
        awayScore: 3,
        homeScore: 4,
        innings: 9,
        playByPlay: [
          {
            inning: 1,
            halfInning: 'top',
            outs: 0,
            batterId: 'p1',
            pitcherId: 'p2',
            cardPosition: 0,
            cardValue: 7,
            outcomeTableRow: 1,
            description: 'Single to left field',
            scoreAfter: { away: 0, home: 0 },
          },
        ],
        boxScore: { lineScore: { away: [1, 2], home: [3, 1] }, awayHits: 5, homeHits: 8, awayErrors: 0, homeErrors: 1 },
        playerBattingLines: [],
        playerPitchingLines: [],
        playerNames: {},
      },
      error: null,
      simulateGame: vi.fn(),
      reset: vi.fn(),
    });

    render(<GameViewerPage />);
    // Default tab is box-score, switch to play-by-play
    fireEvent.click(screen.getByRole('tab', { name: 'Play-by-Play' }));
    expect(screen.getByText('Single to left field')).toBeInTheDocument();
  });

  it('renders BoxScoreDisplay when worker result is available and box score tab active', () => {
    mockUseWorkerSimulation.mockReturnValue({
      status: 'complete',
      result: {
        awayScore: 3,
        homeScore: 4,
        innings: 9,
        playByPlay: [],
        boxScore: { lineScore: { away: [1, 2], home: [3, 1] }, awayHits: 5, homeHits: 8, awayErrors: 0, homeErrors: 1 },
        playerBattingLines: [],
        playerPitchingLines: [],
        playerNames: {},
      },
      error: null,
      simulateGame: vi.fn(),
      reset: vi.fn(),
    });

    render(<GameViewerPage />);
    // Box score tab is active by default
    expect(screen.getByText('Batting')).toBeInTheDocument();
    expect(screen.getByText('Pitching')).toBeInTheDocument();
  });
});
