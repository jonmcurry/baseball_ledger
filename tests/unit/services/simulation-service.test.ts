/**
 * Tests for Simulation Service
 *
 * Verifies simulation start, Realtime subscription, and unsubscribe.
 */

vi.mock('../../../src/services/api-client', () => ({
  apiGet: vi.fn(),
  apiGetPaginated: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

import {
  startSimulation,
  subscribeToProgress,
  unsubscribeFromProgress,
} from '../../../src/services/simulation-service';
import { apiPost } from '../../../src/services/api-client';
import { getSupabaseClient } from '@lib/supabase/client';

const mockApiPost = vi.mocked(apiPost);
const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

const defaultMeta = { requestId: 'req-1', timestamp: '2024-01-01' };

function createMockChannel() {
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };
}

describe('simulation-service', () => {
  let mockChannel: ReturnType<typeof createMockChannel>;
  let mockSupabase: { channel: ReturnType<typeof vi.fn>; removeChannel: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiPost.mockResolvedValue({ data: {}, meta: defaultMeta });

    mockChannel = createMockChannel();
    mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    };
    mockGetSupabaseClient.mockReturnValue(mockSupabase as never);

    // Clean up module-level activeChannel from prior tests
    unsubscribeFromProgress();
    mockSupabase.removeChannel.mockClear();
    mockSupabase.channel.mockClear();
  });

  it('startSimulation calls apiPost and returns SimDayResult', async () => {
    mockApiPost.mockResolvedValue({
      data: { dayNumber: 42, games: [{ id: 'g1' }] },
      meta: defaultMeta,
    });

    const result = await startSimulation('lg-1');

    expect(mockApiPost).toHaveBeenCalledWith('/api/leagues/lg-1/simulate', { days: 1 });
    expect(result).toEqual({ dayNumber: 42, games: [{ id: 'g1' }] });
  });

  it('subscribeToProgress creates a Realtime channel with correct config', () => {
    const callback = vi.fn();

    subscribeToProgress('lg-1', callback);

    expect(mockSupabase.channel).toHaveBeenCalledWith('simulation_progress:lg-1');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'simulation_progress',
        filter: 'league_id=eq.lg-1',
      },
      expect.any(Function),
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('subscribeToProgress unsubscribes existing channel before creating new one', () => {
    const callback = vi.fn();

    // First subscription
    subscribeToProgress('lg-1', callback);
    // Second subscription should clean up the first
    subscribeToProgress('lg-2', callback);

    expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(1);
    expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
  });

  it('unsubscribeFromProgress removes the active channel', () => {
    const callback = vi.fn();
    subscribeToProgress('lg-1', callback);

    unsubscribeFromProgress();

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('unsubscribeFromProgress does nothing when no active channel', () => {
    // Ensure clean state: call unsubscribe without any prior subscription
    // Reset mocks to clear any prior calls
    mockSupabase.removeChannel.mockClear();

    unsubscribeFromProgress();

    expect(mockSupabase.removeChannel).not.toHaveBeenCalled();
  });
});
