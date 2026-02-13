/**
 * Tests for draftStore
 */

import { useDraftStore } from '@stores/draftStore';
import { useLeagueStore } from '@stores/leagueStore';
import { createMockDraftState, createMockAvailablePlayer } from '../../fixtures/mock-draft';
import * as draftService from '@services/draft-service';

vi.mock('@services/draft-service', () => ({
  fetchDraftState: vi.fn(),
  submitPick: vi.fn(),
  autoPick: vi.fn(),
  fetchAvailablePlayers: vi.fn(),
}));

vi.mock('@stores/leagueStore', () => ({
  useLeagueStore: {
    getState: vi.fn(() => ({
      fetchLeagueData: vi.fn(),
    })),
  },
}));

const mockFetchDraftState = vi.mocked(draftService.fetchDraftState);

describe('draftStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDraftStore.getState().reset();
  });

  it('initializes with null draft state', () => {
    const state = useDraftStore.getState();
    expect(state.draftState).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets available players', () => {
    const players = [createMockAvailablePlayer()];
    useDraftStore.getState().setAvailablePlayers(players);
    expect(useDraftStore.getState().availablePlayers).toHaveLength(1);
    expect(useDraftStore.getState().availablePlayers[0].playerId).toBe('ruth01');
  });

  it('ticks timer down', () => {
    useDraftStore.getState().resetTimer(60);
    useDraftStore.getState().tickTimer();
    expect(useDraftStore.getState().pickTimerSeconds).toBe(59);
  });

  it('timer does not go below zero', () => {
    useDraftStore.getState().resetTimer(0);
    useDraftStore.getState().tickTimer();
    expect(useDraftStore.getState().pickTimerSeconds).toBe(0);
  });

  it('sets loading state', () => {
    useDraftStore.getState().setLoading(true);
    expect(useDraftStore.getState().isLoading).toBe(true);
  });

  it('resets to initial state', () => {
    useDraftStore.getState().setError('some error');
    useDraftStore.getState().setAvailablePlayers([createMockAvailablePlayer()]);
    useDraftStore.getState().reset();

    const state = useDraftStore.getState();
    expect(state.draftState).toBeNull();
    expect(state.error).toBeNull();
    expect(state.availablePlayers).toHaveLength(0);
  });

  describe('fetchDraftState league refresh on completion', () => {
    it('refreshes league data when draft transitions to completed', async () => {
      const mockFetchLeagueData = vi.fn();
      vi.mocked(useLeagueStore.getState).mockReturnValue({
        fetchLeagueData: mockFetchLeagueData,
      } as any);

      // Set initial draft state to in_progress
      useDraftStore.setState({ draftState: createMockDraftState({ status: 'in_progress' }) });

      // fetchDraftState returns completed
      mockFetchDraftState.mockResolvedValue(createMockDraftState({ status: 'completed' }));

      await useDraftStore.getState().fetchDraftState('league-1');

      expect(useDraftStore.getState().draftState?.status).toBe('completed');
      expect(mockFetchLeagueData).toHaveBeenCalledWith('league-1');
    });

    it('does not refresh league data when draft stays in_progress', async () => {
      const mockFetchLeagueData = vi.fn();
      vi.mocked(useLeagueStore.getState).mockReturnValue({
        fetchLeagueData: mockFetchLeagueData,
      } as any);

      useDraftStore.setState({ draftState: createMockDraftState({ status: 'in_progress' }) });
      mockFetchDraftState.mockResolvedValue(createMockDraftState({ status: 'in_progress' }));

      await useDraftStore.getState().fetchDraftState('league-1');

      expect(mockFetchLeagueData).not.toHaveBeenCalled();
    });

    it('does not refresh league data when already completed', async () => {
      const mockFetchLeagueData = vi.fn();
      vi.mocked(useLeagueStore.getState).mockReturnValue({
        fetchLeagueData: mockFetchLeagueData,
      } as any);

      useDraftStore.setState({ draftState: createMockDraftState({ status: 'completed' }) });
      mockFetchDraftState.mockResolvedValue(createMockDraftState({ status: 'completed' }));

      await useDraftStore.getState().fetchDraftState('league-1');

      expect(mockFetchLeagueData).not.toHaveBeenCalled();
    });
  });
});
