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
} from '../../../src/services/draft-service';
import { apiGet, apiPost } from '../../../src/services/api-client';

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

const defaultMeta = { requestId: 'req-1', timestamp: '2024-01-01' };

describe('draft-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: {}, meta: defaultMeta });
    mockApiPost.mockResolvedValue({ data: {}, meta: defaultMeta });
  });

  it('startDraft calls apiPost with correct path and returns data', async () => {
    const draftState = { leagueId: 'lg-1', status: 'in_progress', round: 1 };
    mockApiPost.mockResolvedValue({ data: draftState, meta: defaultMeta });

    const result = await startDraft('lg-1');

    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues/lg-1/draft/start');
    expect(result).toEqual(draftState);
  });

  it('submitPick calls apiPost with correct path and pick body', async () => {
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

    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues/lg-1/draft/pick', pick);
    expect(result).toEqual(pickResult);
  });

  it('fetchDraftState calls apiGet with correct path and returns data', async () => {
    const draftState = { leagueId: 'lg-1', status: 'completed', round: 21 };
    mockApiGet.mockResolvedValue({ data: draftState, meta: defaultMeta });

    const result = await fetchDraftState('lg-1');

    expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1/draft/state');
    expect(result).toEqual(draftState);
  });

  it('startDraft sends no body in the POST request', async () => {
    await startDraft('lg-1');

    // apiPost is called with only the path (no body argument)
    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues/lg-1/draft/start');
    expect(mockApiPost.mock.calls[0]).toHaveLength(1);
  });
});
