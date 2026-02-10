/**
 * Tests for Draft Service
 *
 * Verifies that each draft-service function calls the correct
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
  startDraft,
  submitPick,
  fetchDraftState,
  autoPick,
  fetchAvailablePlayers,
} from '../../../src/services/draft-service';
import { apiGet, apiGetPaginated, apiPost } from '../../../src/services/api-client';

const mockApiGet = vi.mocked(apiGet);
const mockApiGetPaginated = vi.mocked(apiGetPaginated);
const mockApiPost = vi.mocked(apiPost);

const defaultMeta = { requestId: 'req-1', timestamp: '2024-01-01' };

describe('draft-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: {}, meta: defaultMeta });
    mockApiGetPaginated.mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 100, totalRows: 0 } });
    mockApiPost.mockResolvedValue({ data: {}, meta: defaultMeta });
  });

  it('startDraft calls apiPost with correct path and action body', async () => {
    const draftState = { leagueId: 'lg-1', status: 'in_progress', round: 1 };
    mockApiPost.mockResolvedValue({ data: draftState, meta: defaultMeta });

    const result = await startDraft('lg-1');

    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues/lg-1/draft', { action: 'start' });
    expect(result).toEqual(draftState);
  });

  it('submitPick calls apiPost with correct path and pick body with action', async () => {
    const pick = {
      playerId: 'player-42',
      playerName: 'Babe Ruth',
      position: 'RF',
      seasonYear: 1927,
      playerCard: { power: 21, speed: 7 },
    };
    const pickResult = { pickNumber: 1, teamId: 'team-1', ...pick };
    mockApiPost.mockResolvedValue({ data: pickResult, meta: defaultMeta });

    const result = await submitPick('lg-1', pick);

    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues/lg-1/draft', { action: 'pick', ...pick });
    expect(result).toEqual(pickResult);
  });

  it('fetchDraftState calls apiGet with correct path and returns data', async () => {
    const draftState = { leagueId: 'lg-1', status: 'completed', round: 21 };
    mockApiGet.mockResolvedValue({ data: draftState, meta: defaultMeta });

    const result = await fetchDraftState('lg-1');

    expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1/draft');
    expect(result).toEqual(draftState);
  });

  it('startDraft sends action in the POST body', async () => {
    await startDraft('lg-1');

    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues/lg-1/draft', { action: 'start' });
    expect(mockApiPost.mock.calls[0]).toHaveLength(2);
  });

  it('autoPick calls apiPost with auto-pick action', async () => {
    const autoPickResult = { status: 'triggered' };
    mockApiPost.mockResolvedValue({ data: autoPickResult, meta: defaultMeta });

    const result = await autoPick('lg-1');

    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues/lg-1/draft', { action: 'auto-pick' });
    expect(result).toEqual(autoPickResult);
  });

  it('autoPick propagates errors', async () => {
    mockApiPost.mockRejectedValue(new Error('Network error'));

    await expect(autoPick('lg-1')).rejects.toThrow('Network error');
  });

  it('fetchAvailablePlayers calls apiGetPaginated with draft?resource=players URL', async () => {
    const players = [{ playerId: 'p1' }];
    mockApiGetPaginated.mockResolvedValue({ data: players, pagination: { page: 1, pageSize: 100, totalRows: 1 } });

    const result = await fetchAvailablePlayers('lg-1');

    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      expect.stringContaining('/api/leagues/lg-1/draft?resource=players&'),
    );
    expect(result).toEqual(players);
  });

  it('fetchAvailablePlayers passes filter params in URL', async () => {
    mockApiGetPaginated.mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 50, totalRows: 0 } });

    await fetchAvailablePlayers('lg-1', { position: 'SP', page: 2, pageSize: 50 });

    const url = mockApiGetPaginated.mock.calls[0][0];
    expect(url).toContain('resource=players');
    expect(url).toContain('position=SP');
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=50');
  });
});
