/**
 * Tests for Stats Store -- async actions
 *
 * Covers fetchBattingLeaders, fetchPitchingLeaders, fetchTeamStats.
 * REQ-STATE-015 through REQ-STATE-016.
 */

vi.mock('@services/stats-service', () => ({
  fetchBattingLeaders: vi.fn(),
  fetchPitchingLeaders: vi.fn(),
  fetchTeamStats: vi.fn(),
}));

import { useStatsStore } from '../../../src/stores/statsStore';
import * as statsService from '@services/stats-service';

const mockBattingResponse = {
  data: [{ playerId: 'p1', teamId: 't1', leagueDivision: 'AL' as const, stats: { G: 150, AB: 580, R: 90, H: 175, doubles: 30, triples: 5, HR: 25, RBI: 85, SB: 20, CS: 5, BB: 60, SO: 100, IBB: 3, HBP: 5, SH: 2, SF: 4, GIDP: 10, BA: 0.302, OBP: 0.370, SLG: 0.510, OPS: 0.880 } }],
  meta: { requestId: 'r1', timestamp: '2024-01-01' },
  pagination: { page: 1, pageSize: 50, totalRows: 1, totalPages: 1 },
};

const mockPitchingResponse = {
  data: [{ playerId: 'pp1', teamId: 't1', leagueDivision: 'AL' as const, stats: { G: 33, GS: 33, W: 18, L: 6, SV: 0, IP: 220.1, H: 180, R: 70, ER: 60, HR: 15, BB: 45, SO: 210, HBP: 5, BF: 880, WP: 3, BK: 0, CG: 4, SHO: 2, HLD: 0, BS: 0, ERA: 2.45, WHIP: 1.02 } }],
  meta: { requestId: 'r2', timestamp: '2024-01-01' },
  pagination: { page: 1, pageSize: 50, totalRows: 1, totalPages: 1 },
};

const mockTeamStats = [
  {
    teamId: 't1',
    runsScored: 800,
    runsAllowed: 650,
    runDifferential: 150,
    totalHR: 200,
    totalSB: 100,
    totalErrors: 80,
    teamBA: 0.270,
    teamOBP: 0.345,
    teamSLG: 0.440,
    teamERA: 3.20,
    pythagoreanWinPct: 0.590,
  },
];

describe('statsStore async actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStatsStore.getState().reset();
  });

  // -----------------------------------------------------------------------
  // fetchBattingLeaders
  // -----------------------------------------------------------------------

  it('fetchBattingLeaders sets loading and populates leaders', async () => {
    vi.mocked(statsService.fetchBattingLeaders).mockResolvedValue(mockBattingResponse);

    await useStatsStore.getState().fetchBattingLeaders('league-1');

    const state = useStatsStore.getState();
    expect(state.battingLeaders).toEqual(mockBattingResponse.data);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchBattingLeaders uses current page from store', async () => {
    vi.mocked(statsService.fetchBattingLeaders).mockResolvedValue(mockBattingResponse);

    // Set page to 3 before calling
    useStatsStore.getState().setPage(3);
    await useStatsStore.getState().fetchBattingLeaders('league-1');

    expect(statsService.fetchBattingLeaders).toHaveBeenCalledWith('league-1', 3);
  });

  it('fetchBattingLeaders sets error on failure', async () => {
    vi.mocked(statsService.fetchBattingLeaders).mockRejectedValue(new Error('Stats unavailable'));

    await useStatsStore.getState().fetchBattingLeaders('league-1');

    const state = useStatsStore.getState();
    expect(state.error).toBe('Stats unavailable');
    expect(state.isLoading).toBe(false);
  });

  // -----------------------------------------------------------------------
  // fetchPitchingLeaders
  // -----------------------------------------------------------------------

  it('fetchPitchingLeaders populates pitching leaders', async () => {
    vi.mocked(statsService.fetchPitchingLeaders).mockResolvedValue(mockPitchingResponse);

    await useStatsStore.getState().fetchPitchingLeaders('league-1');

    const state = useStatsStore.getState();
    expect(state.pitchingLeaders).toEqual(mockPitchingResponse.data);
    expect(state.isLoading).toBe(false);
  });

  // -----------------------------------------------------------------------
  // fetchTeamStats
  // -----------------------------------------------------------------------

  it('fetchTeamStats populates team stats', async () => {
    vi.mocked(statsService.fetchTeamStats).mockResolvedValue(mockTeamStats);

    await useStatsStore.getState().fetchTeamStats('league-1');

    expect(useStatsStore.getState().teamStats).toEqual(mockTeamStats);
  });

  it('fetchTeamStats sets error on failure', async () => {
    vi.mocked(statsService.fetchTeamStats).mockRejectedValue(new Error('Team stats failed'));

    await useStatsStore.getState().fetchTeamStats('league-1');

    expect(useStatsStore.getState().error).toBe('Team stats failed');
  });
});
