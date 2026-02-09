// @vitest-environment jsdom
/**
 * Tests for useDraft hook
 */

import { renderHook } from '@testing-library/react';
import { useDraft } from '@hooks/useDraft';
import { useAuthStore } from '@stores/authStore';
import { useLeagueStore } from '@stores/leagueStore';
import { useDraftStore } from '@stores/draftStore';
import { createMockDraftState } from '../../fixtures/mock-draft';

describe('useDraft', () => {
  beforeEach(() => {
    useAuthStore.getState().setUser({ id: 'user-1', email: 'test@example.com' } as any);
    useLeagueStore.getState().setTeams([
      { id: 'team-1', name: 'Sluggers', city: 'NY', ownerId: 'user-1' } as any,
      { id: 'team-2', name: 'Stars', city: 'LA', ownerId: 'user-2' } as any,
    ]);
    useDraftStore.getState().reset();
  });

  it('identifies myTeam from auth user', () => {
    const { result } = renderHook(() => useDraft());
    expect(result.current.myTeam?.id).toBe('team-1');
  });

  it('isMyPick is true when current team matches my team', () => {
    useDraftStore.setState({ draftState: createMockDraftState({ currentTeamId: 'team-1' }) });
    const { result } = renderHook(() => useDraft());
    expect(result.current.isMyPick).toBe(true);
  });

  it('isMyPick is false when current team is different', () => {
    useDraftStore.setState({ draftState: createMockDraftState({ currentTeamId: 'team-2' }) });
    const { result } = renderHook(() => useDraft());
    expect(result.current.isMyPick).toBe(false);
  });

  it('returns current team name', () => {
    useDraftStore.setState({ draftState: createMockDraftState({ currentTeamId: 'team-2' }) });
    const { result } = renderHook(() => useDraft());
    expect(result.current.currentTeamName).toBe('LA Stars');
  });
});
