// @vitest-environment jsdom
/**
 * Tests for useLeague hook
 */

import { renderHook } from '@testing-library/react';
import { useLeague } from '@hooks/useLeague';
import { useAuthStore } from '@stores/authStore';
import { useLeagueStore } from '@stores/leagueStore';
import { createMockLeague, createMockTeams, createMockStandings } from '../../../tests/fixtures/mock-league';

describe('useLeague', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      isInitialized: false,
      error: null,
    });
    useLeagueStore.setState({
      activeLeagueId: null,
      league: null,
      teams: [],
      standings: [],
      schedule: [],
      currentDay: 0,
      isLoading: false,
      error: null,
    });
  });

  it('exposes league from store', () => {
    useLeagueStore.getState().setActiveLeague(createMockLeague());

    const { result } = renderHook(() => useLeague());
    expect(result.current.league?.name).toBe('Test League');
  });

  it('exposes teams from store', () => {
    useLeagueStore.getState().setTeams(createMockTeams());

    const { result } = renderHook(() => useLeague());
    expect(result.current.teams).toHaveLength(8);
  });

  it('exposes standings from store', () => {
    useLeagueStore.getState().setStandings(createMockStandings());

    const { result } = renderHook(() => useLeague());
    expect(result.current.standings).toHaveLength(4);
  });

  it('isCommissioner is false when no user', () => {
    useLeagueStore.getState().setActiveLeague(createMockLeague());

    const { result } = renderHook(() => useLeague());
    expect(result.current.isCommissioner).toBe(false);
  });

  it('isCommissioner is true when user is commissioner', () => {
    useAuthStore.getState().setUser({ id: 'user-1', email: 'x@y.com', displayName: 'Commissioner' });
    useLeagueStore.getState().setActiveLeague(createMockLeague({ commissionerId: 'user-1' }));

    const { result } = renderHook(() => useLeague());
    expect(result.current.isCommissioner).toBe(true);
  });

  it('isCommissioner is false when user is not commissioner', () => {
    useAuthStore.getState().setUser({ id: 'user-2', email: 'x@y.com', displayName: 'Player' });
    useLeagueStore.getState().setActiveLeague(createMockLeague({ commissionerId: 'user-1' }));

    const { result } = renderHook(() => useLeague());
    expect(result.current.isCommissioner).toBe(false);
  });

  it('exposes currentDay from store', () => {
    useLeagueStore.getState().setActiveLeague(createMockLeague({ currentDay: 81 }));

    const { result } = renderHook(() => useLeague());
    expect(result.current.currentDay).toBe(81);
  });

  it('exposes loading and error state', () => {
    useLeagueStore.getState().setLoading(true);
    useLeagueStore.getState().setError('Network error');

    const { result } = renderHook(() => useLeague());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('Network error');
  });

  it('exposes leagueStatus from league', () => {
    useLeagueStore.getState().setActiveLeague(createMockLeague({ status: 'playoffs' }));

    const { result } = renderHook(() => useLeague());
    expect(result.current.leagueStatus).toBe('playoffs');
  });
});
