/**
 * Tests for League Store -- async actions
 *
 * Covers fetchLeagueData, fetchStandings, fetchSchedule.
 * REQ-STATE-002 through REQ-STATE-008, REQ-ERR-015 (stale data preservation).
 */

vi.mock('@services/league-service', () => ({
  fetchLeague: vi.fn(),
  fetchTeams: vi.fn(),
  fetchStandings: vi.fn(),
  fetchSchedule: vi.fn(),
}));

import { useLeagueStore } from '../../../src/stores/leagueStore';
import * as leagueService from '@services/league-service';

const mockLeague = {
  id: 'league-1',
  name: 'Test',
  commissionerId: 'user-1',
  inviteKey: 'ABC',
  teamCount: 8,
  yearRangeStart: 1990,
  yearRangeEnd: 1995,
  injuriesEnabled: false,
  status: 'regular_season' as const,
  currentDay: 81,
};

const mockTeams = [
  { id: 't1', name: 'Eagles', city: 'East', ownerId: 'user-1', managerProfile: 'balanced', leagueDivision: 'AL' as const, division: 'East', wins: 50, losses: 40, runsScored: 400, runsAllowed: 350 },
];

const mockStandings = [
  { leagueDivision: 'AL' as const, division: 'East', teams: mockTeams },
];

const mockSchedule = [
  { dayNumber: 81, games: [] },
];

function setupSuccessMocks() {
  vi.mocked(leagueService.fetchLeague).mockResolvedValue(mockLeague);
  vi.mocked(leagueService.fetchTeams).mockResolvedValue(mockTeams);
  vi.mocked(leagueService.fetchStandings).mockResolvedValue(mockStandings);
  vi.mocked(leagueService.fetchSchedule).mockResolvedValue(mockSchedule);
}

describe('leagueStore async actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLeagueStore.getState().reset();
  });

  // -----------------------------------------------------------------------
  // fetchLeagueData
  // -----------------------------------------------------------------------

  it('fetchLeagueData sets isLoading to true during fetch', async () => {
    // Use a deferred promise so we can inspect state mid-flight
    let resolveFetch!: (value: typeof mockLeague) => void;
    vi.mocked(leagueService.fetchLeague).mockReturnValue(
      new Promise((resolve) => { resolveFetch = resolve; }),
    );
    vi.mocked(leagueService.fetchTeams).mockResolvedValue([]);
    vi.mocked(leagueService.fetchStandings).mockResolvedValue([]);
    vi.mocked(leagueService.fetchSchedule).mockResolvedValue([]);

    const promise = useLeagueStore.getState().fetchLeagueData('league-1');
    // isLoading should be true while the fetch is in progress
    expect(useLeagueStore.getState().isLoading).toBe(true);

    resolveFetch(mockLeague);
    await promise;

    expect(useLeagueStore.getState().isLoading).toBe(false);
  });

  it('fetchLeagueData populates league, teams, standings, schedule on success', async () => {
    setupSuccessMocks();

    await useLeagueStore.getState().fetchLeagueData('league-1');

    const state = useLeagueStore.getState();
    expect(state.league).toEqual(mockLeague);
    expect(state.teams).toEqual(mockTeams);
    expect(state.standings).toEqual(mockStandings);
    expect(state.schedule).toEqual(mockSchedule);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchLeagueData sets error on failure and preserves stale data (REQ-ERR-015)', async () => {
    // Pre-populate stale data
    useLeagueStore.getState().setTeams(mockTeams);

    vi.mocked(leagueService.fetchLeague).mockRejectedValue(new Error('Network error'));
    vi.mocked(leagueService.fetchTeams).mockResolvedValue([]);
    vi.mocked(leagueService.fetchStandings).mockResolvedValue([]);
    vi.mocked(leagueService.fetchSchedule).mockResolvedValue([]);

    await useLeagueStore.getState().fetchLeagueData('league-1');

    const state = useLeagueStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isLoading).toBe(false);
    // Stale teams data should still be present
    expect(state.teams).toEqual(mockTeams);
  });

  it('fetchLeagueData sets activeLeagueId and currentDay from league data', async () => {
    setupSuccessMocks();

    await useLeagueStore.getState().fetchLeagueData('league-1');

    const state = useLeagueStore.getState();
    expect(state.activeLeagueId).toBe('league-1');
    expect(state.currentDay).toBe(81);
  });

  // -----------------------------------------------------------------------
  // fetchStandings
  // -----------------------------------------------------------------------

  it('fetchStandings updates standings state', async () => {
    vi.mocked(leagueService.fetchStandings).mockResolvedValue(mockStandings);

    await useLeagueStore.getState().fetchStandings('league-1');

    expect(useLeagueStore.getState().standings).toEqual(mockStandings);
  });

  it('fetchStandings sets error on failure', async () => {
    vi.mocked(leagueService.fetchStandings).mockRejectedValue(new Error('Standings unavailable'));

    await useLeagueStore.getState().fetchStandings('league-1');

    expect(useLeagueStore.getState().error).toBe('Standings unavailable');
  });

  // -----------------------------------------------------------------------
  // fetchSchedule
  // -----------------------------------------------------------------------

  it('fetchSchedule updates schedule state', async () => {
    vi.mocked(leagueService.fetchSchedule).mockResolvedValue(mockSchedule);

    await useLeagueStore.getState().fetchSchedule('league-1');

    expect(useLeagueStore.getState().schedule).toEqual(mockSchedule);
  });

  it('fetchSchedule passes day parameter to service', async () => {
    vi.mocked(leagueService.fetchSchedule).mockResolvedValue([]);

    await useLeagueStore.getState().fetchSchedule('league-1', 42);

    expect(leagueService.fetchSchedule).toHaveBeenCalledWith('league-1', 42);
  });
});
