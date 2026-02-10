// @vitest-environment jsdom
/**
 * Tests for DashboardPage
 *
 * Mocks hooks to isolate page rendering logic.
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { DashboardPage } from '@features/dashboard/DashboardPage';
import { createMockLeague, createMockTeams, createMockStandings, createMockScheduleDay, createMockGame } from '../../../../tests/fixtures/mock-league';

vi.mock('@hooks/useLeague', () => ({
  useLeague: vi.fn(),
}));

vi.mock('@hooks/useSimulation', () => ({
  useSimulation: vi.fn(),
}));

vi.mock('@hooks/useRealtimeProgress', () => ({
  useRealtimeProgress: vi.fn().mockReturnValue({ status: 'idle' }),
}));

import { useLeague } from '@hooks/useLeague';
import { useSimulation } from '@hooks/useSimulation';
import { useRealtimeProgress } from '@hooks/useRealtimeProgress';

const mockUseLeague = vi.mocked(useLeague);
const mockUseSimulation = vi.mocked(useSimulation);
const mockUseRealtimeProgress = vi.mocked(useRealtimeProgress);

function defaultSimulationMock(overrides: Record<string, unknown> = {}) {
  return {
    status: 'idle' as const,
    totalGames: 0,
    completedGames: 0,
    totalDays: 0,
    currentDay: 0,
    results: [],
    error: null,
    progressPct: 0,
    isRunning: false,
    startSimulation: vi.fn(),
    runSimulation: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function setDefaultMocks() {
  mockUseLeague.mockReturnValue({
    league: createMockLeague(),
    teams: createMockTeams(),
    standings: createMockStandings(),
    schedule: [createMockScheduleDay(42)],
    currentDay: 42,
    isLoading: false,
    error: null,
    isCommissioner: false,
    leagueStatus: 'regular_season',
  });

  mockUseSimulation.mockReturnValue(defaultSimulationMock());
  mockUseRealtimeProgress.mockReturnValue({ status: 'idle' });
}

describe('DashboardPage', () => {
  beforeEach(() => {
    setDefaultMocks();
  });

  it('shows loading state when isLoading is true', () => {
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

    render(<DashboardPage />);
    expect(screen.getByText('Loading league data...')).toBeInTheDocument();
  });

  it('displays league name', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Test League')).toBeInTheDocument();
  });

  it('displays current day and status', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Day 42 -- regular season/)).toBeInTheDocument();
  });

  it('shows "Dashboard" when no league', () => {
    mockUseLeague.mockReturnValue({
      league: null,
      teams: [],
      standings: [],
      schedule: [],
      currentDay: 0,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: null,
    });

    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders simulation control buttons', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Sim Day')).toBeInTheDocument();
    expect(screen.getByText('Sim Season')).toBeInTheDocument();
  });

  it('renders standings section', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Standings')).toBeInTheDocument();
  });

  it('displays error banner when error exists', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague(),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      currentDay: 42,
      isLoading: false,
      error: 'Something went wrong',
      isCommissioner: false,
      leagueStatus: 'regular_season',
    });

    render(<DashboardPage />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows schedule for current day', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague(),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [
        createMockScheduleDay(42, [
          createMockGame({
            id: 'g-42-0',
            homeTeamId: 'al-e1',
            awayTeamId: 'al-e2',
            isComplete: true,
            homeScore: 5,
            awayScore: 3,
          }),
        ]),
      ],
      currentDay: 42,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'regular_season',
    });

    render(<DashboardPage />);
    expect(screen.getByText('Day 42')).toBeInTheDocument();
  });

  it('shows "No games scheduled" when no schedule for current day', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague(),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      currentDay: 42,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'regular_season',
    });

    render(<DashboardPage />);
    expect(screen.getByText('No games scheduled')).toBeInTheDocument();
  });

  it('disables sim buttons when simulation is running', () => {
    mockUseSimulation.mockReturnValue(defaultSimulationMock({
      status: 'running',
      totalGames: 10,
      completedGames: 5,
      progressPct: 50,
      isRunning: true,
    }));

    render(<DashboardPage />);
    const simDayBtn = screen.getByText('Sim Day');
    expect(simDayBtn).toBeDisabled();
  });

  it('shows progress bar when simulation is running', () => {
    mockUseSimulation.mockReturnValue(defaultSimulationMock({
      status: 'running',
      totalGames: 10,
      completedGames: 7,
      progressPct: 70,
      isRunning: true,
    }));

    render(<DashboardPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('calls runSimulation with league id and 1 day when Sim Day is clicked', () => {
    const mockRunSim = vi.fn();
    mockUseSimulation.mockReturnValue(defaultSimulationMock({
      runSimulation: mockRunSim,
    }));

    render(<DashboardPage />);
    fireEvent.click(screen.getByText('Sim Day'));

    expect(mockRunSim).toHaveBeenCalledWith('league-1', 1);
  });

  it('calls runSimulation with 7 days when Sim Week is clicked', () => {
    const mockRunSim = vi.fn();
    mockUseSimulation.mockReturnValue(defaultSimulationMock({
      runSimulation: mockRunSim,
    }));

    render(<DashboardPage />);
    fireEvent.click(screen.getByText('Sim Week'));

    expect(mockRunSim).toHaveBeenCalledWith('league-1', 7);
  });

  it('calls runSimulation with 162 days when Sim Season is clicked', () => {
    const mockRunSim = vi.fn();
    mockUseSimulation.mockReturnValue(defaultSimulationMock({
      runSimulation: mockRunSim,
    }));

    render(<DashboardPage />);
    fireEvent.click(screen.getByText('Sim Season'));

    expect(mockRunSim).toHaveBeenCalledWith('league-1', 162);
  });

  it('passes leagueStatus to SimulationControls for playoff detection', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'playoffs' }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      currentDay: 162,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'playoffs',
    });

    render(<DashboardPage />);
    // In playoff mode, only Sim Day should be visible
    expect(screen.getByText('Sim Day')).toBeInTheDocument();
    expect(screen.queryByText('Sim Week')).not.toBeInTheDocument();
    expect(screen.queryByText('Sim Season')).not.toBeInTheDocument();
  });

  // REQ-STATE-014: Cache invalidation via useRealtimeProgress
  it('calls useRealtimeProgress with league id', () => {
    render(<DashboardPage />);
    expect(mockUseRealtimeProgress).toHaveBeenCalledWith('league-1');
  });

  it('calls useRealtimeProgress with null when no league', () => {
    mockUseLeague.mockReturnValue({
      league: null,
      teams: [],
      standings: [],
      schedule: [],
      currentDay: 0,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: null,
    });

    render(<DashboardPage />);
    expect(mockUseRealtimeProgress).toHaveBeenCalledWith(null);
  });

  // REQ-SCH-007: Typewriter results notification
  it('shows notification when simulation completes with games', () => {
    vi.useFakeTimers();
    mockUseSimulation.mockReturnValue(defaultSimulationMock({
      status: 'complete',
      totalDays: 7,
      completedGames: 28,
    }));

    render(<DashboardPage />);

    // Advance timers for typewriter animation
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId('simulation-notification')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('does not show notification when simulation completes with zero games', () => {
    mockUseSimulation.mockReturnValue(defaultSimulationMock({
      status: 'complete',
      totalDays: 0,
      completedGames: 0,
    }));

    render(<DashboardPage />);
    expect(screen.queryByTestId('simulation-notification')).not.toBeInTheDocument();
  });
});
