/**
 * Tests for Roster Store
 */

import { useRosterStore } from '@stores/rosterStore';
import { createMockRoster } from '../../../tests/fixtures/mock-roster';

describe('rosterStore', () => {
  beforeEach(() => {
    useRosterStore.getState().reset();
  });

  it('starts with empty state', () => {
    const state = useRosterStore.getState();
    expect(state.activeTeamId).toBeNull();
    expect(state.roster).toHaveLength(0);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setActiveTeam updates team id', () => {
    useRosterStore.getState().setActiveTeam('team-1');
    expect(useRosterStore.getState().activeTeamId).toBe('team-1');
  });

  it('setRoster updates roster and clears error', () => {
    useRosterStore.getState().setError('old error');
    useRosterStore.getState().setRoster(createMockRoster());

    const state = useRosterStore.getState();
    expect(state.roster).toHaveLength(10);
    expect(state.error).toBeNull();
  });

  it('setLoading updates loading state', () => {
    useRosterStore.getState().setLoading(true);
    expect(useRosterStore.getState().isLoading).toBe(true);
  });

  it('setError updates error', () => {
    useRosterStore.getState().setError('Roster fetch failed');
    expect(useRosterStore.getState().error).toBe('Roster fetch failed');
  });

  it('updateRosterSlot changes slot and lineup for a roster entry', () => {
    useRosterStore.getState().setRoster(createMockRoster());
    useRosterStore.getState().updateRosterSlot('r-10', 'starter', 9, 'DH');

    const entry = useRosterStore.getState().roster.find((r) => r.id === 'r-10');
    expect(entry?.rosterSlot).toBe('starter');
    expect(entry?.lineupOrder).toBe(9);
    expect(entry?.lineupPosition).toBe('DH');
  });

  it('updateRosterSlot does nothing for unknown roster entry', () => {
    useRosterStore.getState().setRoster(createMockRoster());
    useRosterStore.getState().updateRosterSlot('nonexistent', 'bench', null, null);
    // No crash, roster unchanged
    expect(useRosterStore.getState().roster).toHaveLength(10);
  });

  it('reset restores initial state', () => {
    const store = useRosterStore.getState();
    store.setActiveTeam('team-1');
    store.setRoster(createMockRoster());
    store.setLoading(true);
    store.reset();

    const state = useRosterStore.getState();
    expect(state.activeTeamId).toBeNull();
    expect(state.roster).toHaveLength(0);
    expect(state.isLoading).toBe(false);
  });
});
