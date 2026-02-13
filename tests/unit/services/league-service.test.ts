/**
 * Tests for League Service
 *
 * Verifies that each league-service function calls the correct
 * api-client function with the correct path and body.
 */

vi.mock('../../../src/services/api-client', () => ({
  apiGet: vi.fn(),
  apiGetPaginated: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

import {
  fetchLeague,
  createLeague,
  deleteLeague,
  joinLeague,
  fetchTeams,
  fetchStandings,
  fetchSchedule,
} from '../../../src/services/league-service';
import { apiGet, apiPost, apiDelete } from '../../../src/services/api-client';

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);
const mockApiDelete = vi.mocked(apiDelete);

const defaultMeta = { requestId: 'req-1', timestamp: '2024-01-01' };

describe('league-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: {}, meta: defaultMeta });
    mockApiPost.mockResolvedValue({ data: {}, meta: defaultMeta });
    mockApiDelete.mockResolvedValue(undefined as never);
  });

  it('fetchLeague calls apiGet with correct path and returns data', async () => {
    const league = { id: 'lg-1', name: 'Test League' };
    mockApiGet.mockResolvedValue({ data: league, meta: defaultMeta });

    const result = await fetchLeague('lg-1');

    expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1');
    expect(result).toEqual(league);
  });

  it('createLeague calls apiPost with correct path and body', async () => {
    const input = { name: 'New League', teamCount: 8 };
    const created = { id: 'lg-new', name: 'New League' };
    mockApiPost.mockResolvedValue({ data: created, meta: defaultMeta });

    const result = await createLeague(input);

    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues', input);
    expect(result).toEqual(created);
  });

  it('deleteLeague calls apiDelete with correct path', async () => {
    await deleteLeague('lg-del');

    expect(mockApiDelete).toHaveBeenCalledWith('/api/leagues/lg-del');
  });

  it('joinLeague calls apiPost with invite key endpoint', async () => {
    const joinResult = { leagueId: 'lg-1', teamId: 'team-1', teamName: 'Team 1' };
    mockApiPost.mockResolvedValue({ data: joinResult, meta: defaultMeta });

    const result = await joinLeague('SECRET01');

    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues/join', { inviteKey: 'SECRET01' });
    expect(result).toEqual(joinResult);
  });

  it('fetchTeams calls apiGet with correct path and returns data', async () => {
    const teams = [{ id: 't1' }, { id: 't2' }];
    mockApiGet.mockResolvedValue({ data: teams, meta: defaultMeta });

    const result = await fetchTeams('lg-1');

    expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1/teams');
    expect(result).toEqual(teams);
  });

  it('fetchStandings calls apiGet with correct path and returns data', async () => {
    const standings = [{ division: 'AL East', teams: [] }];
    mockApiGet.mockResolvedValue({ data: standings, meta: defaultMeta });

    const result = await fetchStandings('lg-1');

    expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1/stats?type=standings');
    expect(result).toEqual(standings);
  });

  it('fetchSchedule calls apiGet without day param when day is omitted', async () => {
    // API returns flat game rows; fetchSchedule groups them into ScheduleDay[]
    const flatRows = [
      { id: 'g-1', dayNumber: 1, homeTeamId: 't-1', awayTeamId: 't-2', homeScore: null, awayScore: null, isComplete: false, gameLogId: null },
      { id: 'g-2', dayNumber: 1, homeTeamId: 't-3', awayTeamId: 't-4', homeScore: null, awayScore: null, isComplete: false, gameLogId: null },
    ];
    mockApiGet.mockResolvedValue({ data: flatRows, meta: defaultMeta });

    const result = await fetchSchedule('lg-1');

    expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1/schedule');
    expect(result).toEqual([
      { dayNumber: 1, games: [
        { id: 'g-1', homeTeamId: 't-1', awayTeamId: 't-2', homeScore: null, awayScore: null, isComplete: false, gameLogId: null },
        { id: 'g-2', homeTeamId: 't-3', awayTeamId: 't-4', homeScore: null, awayScore: null, isComplete: false, gameLogId: null },
      ] },
    ]);
  });

  it('fetchSchedule calls apiGet with day query param when day is provided', async () => {
    const flatRows = [
      { id: 'g-5', dayNumber: 5, homeTeamId: 't-1', awayTeamId: 't-2', homeScore: 3, awayScore: 1, isComplete: true, gameLogId: 'gl-5' },
    ];
    mockApiGet.mockResolvedValue({ data: flatRows, meta: defaultMeta });

    const result = await fetchSchedule('lg-1', 5);

    expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1/schedule?day=5');
    expect(result).toEqual([
      { dayNumber: 5, games: [
        { id: 'g-5', homeTeamId: 't-1', awayTeamId: 't-2', homeScore: 3, awayScore: 1, isComplete: true, gameLogId: 'gl-5' },
      ] },
    ]);
  });
});
