/**
 * Tests for draftStore
 */

import { useDraftStore } from '@stores/draftStore';
import { createMockDraftState, createMockAvailablePlayer } from '../../fixtures/mock-draft';

vi.mock('@services/draft-service', () => ({
  fetchDraftState: vi.fn(),
  submitPick: vi.fn(),
}));

describe('draftStore', () => {
  beforeEach(() => {
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
});
