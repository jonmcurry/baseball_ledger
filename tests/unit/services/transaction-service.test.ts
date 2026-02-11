/**
 * Tests for Transaction Service
 *
 * REQ-RST-005: Roster transaction service layer.
 * Verifies each function calls the correct api-client endpoint.
 */

vi.mock('../../../src/services/api-client', () => ({
  apiGet: vi.fn(),
  apiGetPaginated: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

import {
  dropPlayer,
  addPlayer,
  submitTrade,
  fetchTransactionHistory,
} from '../../../src/services/transaction-service';
import { apiGet, apiPost } from '../../../src/services/api-client';

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

const defaultMeta = { requestId: 'req-1', timestamp: '2024-01-01' };

describe('transaction-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: {}, meta: defaultMeta });
    mockApiPost.mockResolvedValue({ data: {}, meta: defaultMeta });
  });

  describe('dropPlayer', () => {
    it('calls apiPost with drop type and playersToDrop', async () => {
      const result = { transactionId: 'tx-1', type: 'drop' };
      mockApiPost.mockResolvedValue({ data: result, meta: defaultMeta });

      await dropPlayer('lg-1', 'team-1', 'player-42');

      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/leagues/lg-1/teams',
        {
          type: 'drop',
          teamId: 'team-1',
          playersToDrop: ['player-42'],
        },
      );
    });

    it('returns the transaction result', async () => {
      const result = { transactionId: 'tx-1', type: 'drop', completedAt: '2024-01-01' };
      mockApiPost.mockResolvedValue({ data: result, meta: defaultMeta });

      const response = await dropPlayer('lg-1', 'team-1', 'player-42');
      expect(response).toEqual(result);
    });
  });

  describe('addPlayer', () => {
    it('calls apiPost with add type and playersToAdd', async () => {
      const player = {
        playerId: 'ruth01',
        playerName: 'Babe Ruth',
        seasonYear: 1927,
        playerCard: { power: 21 } as Record<string, unknown>,
      };
      mockApiPost.mockResolvedValue({ data: {}, meta: defaultMeta });

      await addPlayer('lg-1', 'team-1', player);

      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/leagues/lg-1/teams',
        {
          type: 'add',
          teamId: 'team-1',
          playersToAdd: [player],
        },
      );
    });
  });

  describe('submitTrade', () => {
    it('calls apiPost with trade type and both player sets', async () => {
      const result = { transactionId: 'tx-2', type: 'trade' };
      mockApiPost.mockResolvedValue({ data: result, meta: defaultMeta });

      await submitTrade('lg-1', 'team-1', 'team-2', ['p1', 'p2'], ['p3']);

      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/leagues/lg-1/teams',
        {
          type: 'trade',
          teamId: 'team-1',
          targetTeamId: 'team-2',
          playersFromMe: ['p1', 'p2'],
          playersFromThem: ['p3'],
        },
      );
    });

    it('returns the trade result', async () => {
      const result = { transactionId: 'tx-2', type: 'trade', completedAt: '2024-01-01' };
      mockApiPost.mockResolvedValue({ data: result, meta: defaultMeta });

      const response = await submitTrade('lg-1', 'team-1', 'team-2', ['p1'], ['p3']);
      expect(response).toEqual(result);
    });
  });

  describe('fetchTransactionHistory', () => {
    it('calls apiGet with correct path', async () => {
      const history = [{ type: 'drop', playerName: 'Babe Ruth', date: '2024-01-01', details: 'Dropped' }];
      mockApiGet.mockResolvedValue({ data: history, meta: defaultMeta });

      const result = await fetchTransactionHistory('lg-1');

      expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/lg-1/teams?include=history');
      expect(result).toEqual(history);
    });

    it('propagates errors', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'));

      await expect(fetchTransactionHistory('lg-1')).rejects.toThrow('Network error');
    });
  });
});
