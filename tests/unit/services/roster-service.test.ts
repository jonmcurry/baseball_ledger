/**
 * Tests for Roster Service
 *
 * Verifies that each roster-service function calls the correct
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
  fetchRoster,
  updateTeam,
  updateLineup,
} from '../../../src/services/roster-service';
import { apiGet, apiPatch } from '../../../src/services/api-client';

const mockApiGet = vi.mocked(apiGet);
const mockApiPatch = vi.mocked(apiPatch);

const defaultMeta = { requestId: 'req-1', timestamp: '2024-01-01' };

describe('roster-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: {}, meta: defaultMeta });
    mockApiPatch.mockResolvedValue({ data: {}, meta: defaultMeta });
  });

  it('fetchRoster calls apiGet with correct path and returns data', async () => {
    const roster = [{ playerId: 'p1', name: 'Babe Ruth' }];
    mockApiGet.mockResolvedValue({ data: roster, meta: defaultMeta });

    const result = await fetchRoster('lg-1', 'team-1');

    expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1/teams/team-1/roster');
    expect(result).toEqual(roster);
  });

  it('updateTeam calls apiPatch with correct path and updates body', async () => {
    const updates = { name: 'New York Yankees', managerProfile: 'aggressive' };
    const updated = { id: 'team-1', name: 'New York Yankees' };
    mockApiPatch.mockResolvedValue({ data: updated, meta: defaultMeta });

    const result = await updateTeam('lg-1', 'team-1', updates);

    expect(mockApiPatch).toHaveBeenCalledWith('/api/leagues/lg-1/teams/team-1', updates);
    expect(result).toEqual(updated);
  });

  it('updateLineup calls apiPatch with correct path and wraps updates in object', async () => {
    const updates = [
      { playerId: 'p1', battingOrder: 1, fieldingPosition: 'CF' },
      { playerId: 'p2', battingOrder: 2, fieldingPosition: 'SS' },
    ];
    const updatedRoster = [{ playerId: 'p1' }, { playerId: 'p2' }];
    mockApiPatch.mockResolvedValue({ data: updatedRoster, meta: defaultMeta });

    const result = await updateLineup('lg-1', 'team-1', updates as never);

    expect(mockApiPatch).toHaveBeenCalledWith(
      '/api/leagues/lg-1/teams/team-1/roster',
      { updates },
    );
    expect(result).toEqual(updatedRoster);
  });

  it('updateTeam sends only provided fields', async () => {
    const updates = { city: 'Chicago' };
    mockApiPatch.mockResolvedValue({ data: { id: 'team-1', city: 'Chicago' }, meta: defaultMeta });

    await updateTeam('lg-1', 'team-1', updates);

    expect(mockApiPatch).toHaveBeenCalledWith('/api/leagues/lg-1/teams/team-1', { city: 'Chicago' });
  });
});
