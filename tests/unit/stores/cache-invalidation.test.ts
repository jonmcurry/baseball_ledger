/**
 * Tests for cross-store cache invalidation triggers (REQ-STATE-011)
 *
 * Verifies the trigger table from the SRD:
 * - Simulation completes -> invalidate league, roster, stats
 * - Roster change (lineup save) -> invalidate stats
 * - User switches active league -> clear roster, clear stats
 * - User logs out -> reset all stores
 */

vi.mock('@services/simulation-service', () => ({
  startSimulation: vi.fn(),
  subscribeToProgress: vi.fn(),
  unsubscribeFromProgress: vi.fn(),
}));

vi.mock('@services/league-service', () => ({
  fetchLeague: vi.fn(),
  fetchTeams: vi.fn(),
  fetchStandings: vi.fn(),
  fetchSchedule: vi.fn(),
}));

vi.mock('@services/roster-service', () => ({
  fetchRoster: vi.fn(),
  updateLineup: vi.fn(),
  updateTeam: vi.fn(),
}));

vi.mock('@services/stats-service', () => ({
  fetchBattingLeaders: vi.fn(),
  fetchPitchingLeaders: vi.fn(),
  fetchTeamStats: vi.fn(),
}));

vi.mock('@lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
  })),
}));

import { useSimulationStore } from '@stores/simulationStore';
import { useLeagueStore } from '@stores/leagueStore';
import { useRosterStore } from '@stores/rosterStore';
import { useStatsStore } from '@stores/statsStore';
import { useAuthStore } from '@stores/authStore';
import * as simulationService from '@services/simulation-service';
import * as leagueService from '@services/league-service';
import * as rosterService from '@services/roster-service';
import * as statsService from '@services/stats-service';

function setupLeagueMocks() {
  vi.mocked(leagueService.fetchLeague).mockResolvedValue({
    id: 'league-1', name: 'Test', commissionerId: 'u1', inviteKey: 'ABC',
    teamCount: 8, yearRangeStart: 1990, yearRangeEnd: 1995,
    injuriesEnabled: false, negroLeaguesEnabled: true, status: 'regular_season', currentDay: 42,
  });
  vi.mocked(leagueService.fetchTeams).mockResolvedValue([]);
  vi.mocked(leagueService.fetchStandings).mockResolvedValue([]);
  vi.mocked(leagueService.fetchSchedule).mockResolvedValue([]);
}

function setupStatsMocks() {
  vi.mocked(statsService.fetchBattingLeaders).mockResolvedValue({
    data: [], meta: { requestId: 'r1', timestamp: '' }, pagination: { page: 1, pageSize: 25, totalRows: 0, totalPages: 0 },
  });
  vi.mocked(statsService.fetchPitchingLeaders).mockResolvedValue({
    data: [], meta: { requestId: 'r2', timestamp: '' }, pagination: { page: 1, pageSize: 25, totalRows: 0, totalPages: 0 },
  });
  vi.mocked(statsService.fetchTeamStats).mockResolvedValue([]);
}

describe('Cross-store cache invalidation (REQ-STATE-011)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSimulationStore.getState().reset();
    useLeagueStore.getState().reset();
    useRosterStore.getState().reset();
    useStatsStore.getState().reset();
  });

  // -----------------------------------------------------------------------
  // Trigger: Simulation completes
  // -----------------------------------------------------------------------

  it('simulation completion triggers refetch on league, roster, and stats', async () => {
    // Pre-populate stores with IDs so invalidation triggers refetch
    useLeagueStore.setState({ activeLeagueId: 'league-1' });
    useRosterStore.setState({ activeTeamId: 'team-1' });
    setupLeagueMocks();
    setupStatsMocks();
    vi.mocked(rosterService.fetchRoster).mockResolvedValue([]);

    vi.mocked(simulationService.startSimulation).mockResolvedValue(
      { dayNumber: 42, games: [{ id: 'g1' }] },
    );

    await useSimulationStore.getState().runSimulation('league-1', 1);

    // Verify refetch was triggered on all 3 stores
    expect(leagueService.fetchLeague).toHaveBeenCalledWith('league-1');
    expect(rosterService.fetchRoster).toHaveBeenCalledWith('league-1', 'team-1');
    expect(statsService.fetchBattingLeaders).toHaveBeenCalledWith('league-1', 1);
  });

  // -----------------------------------------------------------------------
  // Trigger: Roster change (lineup save)
  // -----------------------------------------------------------------------

  it('saveLineup success triggers stats refetch', async () => {
    useRosterStore.setState({ activeTeamId: 'team-1', roster: [] });
    setupStatsMocks();
    vi.mocked(rosterService.updateLineup).mockResolvedValue([]);

    await useRosterStore.getState().saveLineup('league-1', 'team-1');

    expect(statsService.fetchBattingLeaders).toHaveBeenCalledWith('league-1', 1);
  });

  it('saveLineup failure does NOT trigger stats refetch', async () => {
    useRosterStore.setState({ activeTeamId: 'team-1', roster: [] });
    vi.mocked(rosterService.updateLineup).mockRejectedValue(new Error('Save failed'));

    await useRosterStore.getState().saveLineup('league-1', 'team-1');

    expect(statsService.fetchBattingLeaders).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Trigger: User switches active league
  // -----------------------------------------------------------------------

  it('setActiveLeague clears roster and stats stores', () => {
    // Pre-populate dependent stores
    useRosterStore.setState({ activeTeamId: 'old-team', roster: [{ id: 'r1' }] as never[] });
    useStatsStore.setState({ battingLeaders: [{ playerId: 'p1' }] as never[] });

    useLeagueStore.getState().setActiveLeague({
      id: 'new-league',
      name: 'New League',
      commissionerId: 'user-1',
      inviteKey: 'XYZ',
      teamCount: 8,
      yearRangeStart: 1990,
      yearRangeEnd: 1995,
      injuriesEnabled: false,
      negroLeaguesEnabled: true,
      status: 'regular_season',
      currentDay: 1,
    });

    expect(useRosterStore.getState().activeTeamId).toBeNull();
    expect(useRosterStore.getState().roster).toHaveLength(0);
    expect(useStatsStore.getState().battingLeaders).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Trigger: User logs out
  // -----------------------------------------------------------------------

  it('logout resets all stores', () => {
    // Pre-populate all stores
    useLeagueStore.setState({ activeLeagueId: 'league-1' });
    useRosterStore.setState({ activeTeamId: 'team-1' });
    useStatsStore.setState({ battingLeaders: [{ playerId: 'p1' }] as never[] });
    useSimulationStore.setState({ status: 'complete' });

    useAuthStore.getState().logout();

    expect(useLeagueStore.getState().activeLeagueId).toBeNull();
    expect(useRosterStore.getState().activeTeamId).toBeNull();
    expect(useStatsStore.getState().battingLeaders).toHaveLength(0);
    expect(useSimulationStore.getState().status).toBe('idle');
  });
});
