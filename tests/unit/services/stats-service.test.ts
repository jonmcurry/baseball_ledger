/**
 * Tests for Stats Service
 *
 * Verifies that each stats-service function calls the correct
 * api-client function with the correct path and query parameters.
 */

vi.mock('../../../src/services/api-client', () => ({
  apiGet: vi.fn(),
  apiGetPaginated: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

import {
  fetchBattingLeaders,
  fetchPitchingLeaders,
  fetchTeamStats,
} from '../../../src/services/stats-service';
import { apiGet, apiGetPaginated } from '../../../src/services/api-client';

const mockApiGet = vi.mocked(apiGet);
const mockApiGetPaginated = vi.mocked(apiGetPaginated);

const defaultMeta = { requestId: 'req-1', timestamp: '2024-01-01' };

describe('stats-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: {}, meta: defaultMeta });
    mockApiGetPaginated.mockResolvedValue({
      data: [],
      meta: defaultMeta,
      pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
    });
  });

  it('fetchBattingLeaders uses default parameters', async () => {
    await fetchBattingLeaders('lg-1');

    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      '/api/leagues/lg-1/stats?type=batting&page=1&sortBy=BA&sortOrder=desc',
    );
  });

  it('fetchBattingLeaders passes custom parameters', async () => {
    await fetchBattingLeaders('lg-1', 3, 'HR', 'asc');

    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      '/api/leagues/lg-1/stats?type=batting&page=3&sortBy=HR&sortOrder=asc',
    );
  });

  it('fetchPitchingLeaders uses default parameters', async () => {
    await fetchPitchingLeaders('lg-1');

    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      '/api/leagues/lg-1/stats?type=pitching&page=1&sortBy=ERA&sortOrder=asc',
    );
  });

  it('fetchPitchingLeaders passes custom parameters', async () => {
    await fetchPitchingLeaders('lg-1', 2, 'W', 'desc');

    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      '/api/leagues/lg-1/stats?type=pitching&page=2&sortBy=W&sortOrder=desc',
    );
  });

  it('fetchTeamStats calls apiGet with correct path and returns data', async () => {
    const stats = [{ teamId: 't1', runs: 500 }];
    mockApiGet.mockResolvedValue({ data: stats, meta: defaultMeta });

    const result = await fetchTeamStats('lg-1');

    expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1/stats?type=team');
    expect(result).toEqual(stats);
  });
});
