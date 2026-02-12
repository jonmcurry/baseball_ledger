// @vitest-environment jsdom
/**
 * Tests for DashboardPage
 *
 * Mocks hooks to isolate page rendering logic.
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { DashboardPage } from '@features/dashboard/DashboardPage';
import { createMockLeague, createMockTeams, createMockStandings, createMockScheduleDay, createMockGame, createMockPlayoffBracket } from '../../../../tests/fixtures/mock-league';
import type { PlayoffGameResult } from '@stores/simulationStore';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn().mockReturnValue(vi.fn()),
}));

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
    lastPlayoffResult: null as PlayoffGameResult | null,
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
    playoffBracket: null,
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
      playoffBracket: null,
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
      playoffBracket: null,
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
      playoffBracket: null,
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
      playoffBracket: null,
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
      playoffBracket: null,
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
      playoffBracket: null,
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
      playoffBracket: null,
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

  // REQ-SCH-009: Season completion ceremony
  it('shows SeasonCompletePanel when league is completed', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'completed' }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      playoffBracket: { worldSeriesChampionId: 'al-e1' } as any,
      currentDay: 162,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'completed',
    });

    render(<DashboardPage />);
    expect(screen.getByTestId('season-complete-panel')).toBeInTheDocument();
    expect(screen.getByText('SEASON COMPLETED')).toBeInTheDocument();
    expect(screen.queryByText('Sim Day')).not.toBeInTheDocument();
  });

  it('shows champion name from playoffBracket', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'completed' }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      playoffBracket: { worldSeriesChampionId: 'al-e1' } as any,
      currentDay: 162,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'completed',
    });

    render(<DashboardPage />);
    expect(screen.getByText('Eastern Eagles')).toBeInTheDocument();
  });

  it('shows archive button for commissioner when season is completed', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'completed' }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      playoffBracket: { worldSeriesChampionId: 'al-e1' } as any,
      currentDay: 162,
      isLoading: false,
      error: null,
      isCommissioner: true,
      leagueStatus: 'completed',
    });

    render(<DashboardPage />);
    expect(screen.getByRole('button', { name: /archive season/i })).toBeInTheDocument();
  });

  it('shows SimulationControls during regular_season, not SeasonCompletePanel', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Sim Day')).toBeInTheDocument();
    expect(screen.queryByTestId('season-complete-panel')).not.toBeInTheDocument();
  });

  // REQ-LGE-009: Playoff dashboard integration
  it('renders PlayoffStatusPanel instead of ScheduleView during playoffs', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'playoffs' }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      playoffBracket: createMockPlayoffBracket(),
      currentDay: 163,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'playoffs',
    });

    render(<DashboardPage />);
    expect(screen.getByTestId('playoff-status-panel')).toBeInTheDocument();
    expect(screen.queryByText('No games scheduled')).not.toBeInTheDocument();
  });

  it('renders ScheduleView during regular_season, not PlayoffStatusPanel', () => {
    render(<DashboardPage />);
    expect(screen.queryByTestId('playoff-status-panel')).not.toBeInTheDocument();
  });

  it('passes playoffMessage to SimulationNotification from lastPlayoffResult', () => {
    vi.useFakeTimers();
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'playoffs' }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      playoffBracket: createMockPlayoffBracket(),
      currentDay: 163,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'playoffs',
    });

    mockUseSimulation.mockReturnValue(defaultSimulationMock({
      status: 'complete',
      totalDays: 1,
      completedGames: 1,
      lastPlayoffResult: {
        round: 'ChampionshipSeries',
        seriesId: 'alcs-1',
        gameNumber: 3,
        isPlayoffsComplete: false,
        homeTeamId: 'al-e1',
        awayTeamId: 'al-w1',
        homeScore: 5,
        awayScore: 3,
      } as PlayoffGameResult,
    }));

    render(<DashboardPage />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const notification = screen.getByTestId('simulation-notification');
    expect(notification.textContent).toContain('Championship Series Game 3');
    vi.useRealTimers();
  });

  it('shows PlayoffStatusPanel with last game result after playoff sim', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'playoffs' }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      playoffBracket: createMockPlayoffBracket(),
      currentDay: 163,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'playoffs',
    });

    mockUseSimulation.mockReturnValue(defaultSimulationMock({
      lastPlayoffResult: {
        round: 'ChampionshipSeries',
        seriesId: 'alcs-1',
        gameNumber: 3,
        isPlayoffsComplete: false,
        homeTeamId: 'al-e1',
        awayTeamId: 'al-w1',
        homeScore: 5,
        awayScore: 3,
      } as PlayoffGameResult,
    }));

    render(<DashboardPage />);
    expect(screen.getByTestId('last-game-result')).toBeInTheDocument();
  });

  it('does not render PlayoffStatusPanel during completed status', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'completed' }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      playoffBracket: { worldSeriesChampionId: 'al-e1' } as any,
      currentDay: 162,
      isLoading: false,
      error: null,
      isCommissioner: false,
      leagueStatus: 'completed',
    });

    render(<DashboardPage />);
    expect(screen.queryByTestId('playoff-status-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('season-complete-panel')).toBeInTheDocument();
  });

  // REQ-SCH-009: New season start flow
  it('shows NewSeasonPanel when status=setup and seasonYear > 1', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'setup', seasonYear: 2 }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      playoffBracket: null,
      currentDay: 0,
      isLoading: false,
      error: null,
      isCommissioner: true,
      leagueStatus: 'setup',
    });

    render(<DashboardPage />);
    expect(screen.getByTestId('new-season-panel')).toBeInTheDocument();
    expect(screen.getByText('Season 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start season/i })).toBeInTheDocument();
  });

  it('shows InviteKeyDisplay when status=setup and seasonYear === 1', () => {
    mockUseLeague.mockReturnValue({
      league: createMockLeague({ status: 'setup', seasonYear: 1, inviteKey: 'INV-KEY' }),
      teams: createMockTeams(),
      standings: createMockStandings(),
      schedule: [],
      playoffBracket: null,
      currentDay: 0,
      isLoading: false,
      error: null,
      isCommissioner: true,
      leagueStatus: 'setup',
    });

    render(<DashboardPage />);
    expect(screen.queryByTestId('new-season-panel')).not.toBeInTheDocument();
    expect(screen.getByText('INV-KEY')).toBeInTheDocument();
  });
});
