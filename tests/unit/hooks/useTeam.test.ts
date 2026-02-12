// @vitest-environment jsdom
/**
 * Tests for useTeam hook
 */

import { renderHook } from '@testing-library/react';
import { useTeam } from '@hooks/useTeam';
import { useAuthStore } from '@stores/authStore';
import { useLeagueStore } from '@stores/leagueStore';
import { useRosterStore } from '@stores/rosterStore';
import { createMockTeams } from '../../../tests/fixtures/mock-league';
import { createMockRoster, createMockRosterEntry } from '../../../tests/fixtures/mock-roster';

describe('useTeam', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null, isInitialized: false, error: null });
    useLeagueStore.setState({ activeLeagueId: null, league: null, teams: [], standings: [], schedule: [], currentDay: 0, isLoading: false, error: null });
    useRosterStore.setState({ activeTeamId: null, roster: [], isLoading: false, error: null });
  });

  it('myTeam is null when no user', () => {
    useLeagueStore.getState().setTeams(createMockTeams());

    const { result } = renderHook(() => useTeam());
    expect(result.current.myTeam).toBeNull();
  });

  it('myTeam returns the team owned by the current user', () => {
    useAuthStore.getState().setUser({ id: 'user-1', email: 'x@y.com', displayName: 'Player' });
    useLeagueStore.getState().setTeams(createMockTeams());

    const { result } = renderHook(() => useTeam());
    // al-e1 has ownerId: 'user-1' in mock teams
    expect(result.current.myTeam?.id).toBe('al-e1');
    expect(result.current.myTeam?.name).toBe('Eagles');
  });

  it('myTeam is null when user does not own any team', () => {
    useAuthStore.getState().setUser({ id: 'nobody', email: 'x@y.com', displayName: 'Nobody' });
    useLeagueStore.getState().setTeams(createMockTeams());

    const { result } = renderHook(() => useTeam());
    expect(result.current.myTeam).toBeNull();
  });

  it('exposes roster from store', () => {
    useRosterStore.getState().setRoster(createMockRoster());

    const { result } = renderHook(() => useTeam());
    expect(result.current.roster).toHaveLength(10);
  });

  it('exposes roster loading and error', () => {
    useRosterStore.getState().setLoading(true);
    useRosterStore.getState().setError('Roster error');

    const { result } = renderHook(() => useTeam());
    expect(result.current.isRosterLoading).toBe(true);
    expect(result.current.rosterError).toBe('Roster error');
  });

  it('starters returns only lineup entries', () => {
    useRosterStore.getState().setRoster(createMockRoster());

    const { result } = renderHook(() => useTeam());
    // 8 starters + 1 rotation (with lineupOrder 9) = 9 with lineupOrder
    const starters = result.current.starters;
    expect(starters.length).toBeGreaterThan(0);
    for (const s of starters) {
      expect(s.lineupOrder).not.toBeNull();
    }
  });

  it('bench returns entries with rosterSlot bench', () => {
    useRosterStore.getState().setRoster(createMockRoster());

    const { result } = renderHook(() => useTeam());
    const bench = result.current.bench;
    expect(bench.length).toBeGreaterThan(0);
    for (const b of bench) {
      expect(b.rosterSlot).toBe('bench');
    }
  });

  it('excludes pitchers from bench even when lineupOrder is null', () => {
    const roster = createMockRoster();
    // Add a pitcher with lineupOrder: null and rosterSlot: 'rotation'
    roster.push(createMockRosterEntry({
      id: 'r-pitcher',
      playerId: 'p-pitcher',
      lineupOrder: null,
      lineupPosition: null,
      rosterSlot: 'rotation',
      playerCard: {
        playerId: 'p-pitcher',
        nameFirst: 'Pedro',
        nameLast: 'Martinez',
        seasonYear: 1999,
        battingHand: 'R',
        throwingHand: 'R',
        primaryPosition: 'SP',
        eligiblePositions: ['SP'],
        isPitcher: true,
        card: Array(35).fill(7),
        powerRating: 13,
        archetype: { byte33: 7, byte34: 0 },
        speed: 0.1,
        power: 0,
        discipline: 0.3,
        contactRate: 0.3,
        fieldingPct: 0.95,
        range: 0.3,
        arm: 0.5,
        pitching: { role: 'SP', grade: 1, stamina: 9, era: 2.07, whip: 1.04, k9: 13.2, bb9: 2.1, hr9: 0.5, usageFlags: [], isReliever: false },
      },
    }));
    useRosterStore.getState().setRoster(roster);

    const { result } = renderHook(() => useTeam());
    const bench = result.current.bench;
    const pitcherInBench = bench.find((b) => b.playerId === 'p-pitcher');
    expect(pitcherInBench).toBeUndefined();
  });
});
