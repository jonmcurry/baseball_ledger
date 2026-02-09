// @vitest-environment jsdom
/**
 * Tests for DashboardPage
 *
 * Mocks hooks to isolate page rendering logic.
 */

import { render, screen } from '@testing-library/react';
import { DashboardPage } from '@features/dashboard/DashboardPage';
import { createMockLeague, createMockTeams, createMockStandings, createMockScheduleDay, createMockGame } from '../../../../tests/fixtures/mock-league';

vi.mock('@hooks/useLeague', () => ({
  useLeague: vi.fn(),
}));

vi.mock('@hooks/useSimulation', () => ({
  useSimulation: vi.fn(),
}));

import { useLeague } from '@hooks/useLeague';
import { useSimulation } from '@hooks/useSimulation';

const mockUseLeague = vi.mocked(useLeague);
const mockUseSimulation = vi.mocked(useSimulation);

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

  mockUseSimulation.mockReturnValue({
    status: 'idle',
    totalGames: 0,
    completedGames: 0,
    results: [],
    error: null,
    progressPct: 0,
    isRunning: false,
    startSimulation: vi.fn(),
    reset: vi.fn(),
  });
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
    mockUseSimulation.mockReturnValue({
      status: 'running',
      totalGames: 10,
      completedGames: 5,
      results: [],
      error: null,
      progressPct: 50,
      isRunning: true,
      startSimulation: vi.fn(),
      reset: vi.fn(),
    });

    render(<DashboardPage />);
    const simDayBtn = screen.getByText('Sim Day');
    expect(simDayBtn).toBeDisabled();
  });

  it('shows progress bar when simulation is running', () => {
    mockUseSimulation.mockReturnValue({
      status: 'running',
      totalGames: 10,
      completedGames: 7,
      results: [],
      error: null,
      progressPct: 70,
      isRunning: true,
      startSimulation: vi.fn(),
      reset: vi.fn(),
    });

    render(<DashboardPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
