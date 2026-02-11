/**
 * Tests for League Store
 */

import { useLeagueStore } from '@stores/leagueStore';
import { createMockLeague, createMockTeams, createMockStandings, createMockScheduleDay } from '../../../tests/fixtures/mock-league';

describe('leagueStore', () => {
  beforeEach(() => {
    useLeagueStore.getState().reset();
  });

  it('starts with empty state', () => {
    const state = useLeagueStore.getState();
    expect(state.activeLeagueId).toBeNull();
    expect(state.league).toBeNull();
    expect(state.teams).toHaveLength(0);
    expect(state.standings).toHaveLength(0);
    expect(state.schedule).toHaveLength(0);
    expect(state.currentDay).toBe(0);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setActiveLeague sets league and id', () => {
    const league = createMockLeague();
    useLeagueStore.getState().setActiveLeague(league);

    const state = useLeagueStore.getState();
    expect(state.activeLeagueId).toBe(league.id);
    expect(state.league?.name).toBe('Test League');
    expect(state.currentDay).toBe(42);
  });

  it('setActiveLeague clears error', () => {
    useLeagueStore.getState().setError('old error');
    useLeagueStore.getState().setActiveLeague(createMockLeague());
    expect(useLeagueStore.getState().error).toBeNull();
  });

  it('setTeams updates teams array', () => {
    const teams = createMockTeams();
    useLeagueStore.getState().setTeams(teams);
    expect(useLeagueStore.getState().teams).toHaveLength(8);
  });

  it('setStandings updates standings', () => {
    const standings = createMockStandings();
    useLeagueStore.getState().setStandings(standings);
    expect(useLeagueStore.getState().standings).toHaveLength(4);
  });

  it('setSchedule updates schedule', () => {
    const schedule = [createMockScheduleDay(1), createMockScheduleDay(2)];
    useLeagueStore.getState().setSchedule(schedule);
    expect(useLeagueStore.getState().schedule).toHaveLength(2);
  });

  it('setCurrentDay updates day', () => {
    useLeagueStore.getState().setCurrentDay(100);
    expect(useLeagueStore.getState().currentDay).toBe(100);
  });

  it('setLoading updates loading state', () => {
    useLeagueStore.getState().setLoading(true);
    expect(useLeagueStore.getState().isLoading).toBe(true);
  });

  it('setError updates error', () => {
    useLeagueStore.getState().setError('Network error');
    expect(useLeagueStore.getState().error).toBe('Network error');
  });

  it('updateTeamRecord updates wins and losses for a team', () => {
    useLeagueStore.getState().setTeams(createMockTeams());
    useLeagueStore.getState().updateTeamRecord('al-e1', 60, 30);

    const team = useLeagueStore.getState().teams.find((t) => t.id === 'al-e1');
    expect(team?.wins).toBe(60);
    expect(team?.losses).toBe(30);
  });

  it('updateTeamRecord does nothing for unknown team', () => {
    useLeagueStore.getState().setTeams(createMockTeams());
    useLeagueStore.getState().updateTeamRecord('nonexistent', 99, 99);

    // No team should have 99 wins
    const teams = useLeagueStore.getState().teams;
    expect(teams.every((t) => t.wins !== 99)).toBe(true);
  });

  it('persist config includes version and migrate', () => {
    // REQ-STATE-009: Persist migration for safe schema evolution
    const persistOptions = (useLeagueStore as unknown as { persist: { getOptions: () => { version: number; migrate: unknown } } }).persist.getOptions();
    expect(persistOptions.version).toBe(1);
    expect(typeof persistOptions.migrate).toBe('function');
  });

  it('reset restores initial state', () => {
    const store = useLeagueStore.getState();
    store.setActiveLeague(createMockLeague());
    store.setTeams(createMockTeams());
    store.setLoading(true);
    store.reset();

    const state = useLeagueStore.getState();
    expect(state.activeLeagueId).toBeNull();
    expect(state.teams).toHaveLength(0);
    expect(state.isLoading).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Cache Invalidation (REQ-STATE-011, REQ-STATE-012)
  // -----------------------------------------------------------------------

  it('isStale defaults to false', () => {
    expect(useLeagueStore.getState().isStale).toBe(false);
  });

  it('clearLeague resets data but preserves nothing (full clear)', () => {
    const store = useLeagueStore.getState();
    store.setActiveLeague(createMockLeague());
    store.setTeams(createMockTeams());
    store.setStandings(createMockStandings());
    store.clearLeague();

    const state = useLeagueStore.getState();
    expect(state.activeLeagueId).toBeNull();
    expect(state.league).toBeNull();
    expect(state.teams).toHaveLength(0);
    expect(state.standings).toHaveLength(0);
    expect(state.schedule).toHaveLength(0);
    expect(state.isStale).toBe(false);
    expect(state.error).toBeNull();
  });

  it('reset also resets isStale to false', () => {
    useLeagueStore.setState({ isStale: true });
    useLeagueStore.getState().reset();
    expect(useLeagueStore.getState().isStale).toBe(false);
  });
});
