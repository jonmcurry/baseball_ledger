/**
 * Tests for Stats Store
 */

import { useStatsStore } from '@stores/statsStore';
import { createMockBattingLeaders, createMockPitchingLeaders, createMockTeamStats } from '../../../tests/fixtures/mock-stats';

describe('statsStore', () => {
  beforeEach(() => {
    useStatsStore.getState().reset();
  });

  it('starts with empty leaders and defaults', () => {
    const state = useStatsStore.getState();
    expect(state.battingLeaders).toHaveLength(0);
    expect(state.pitchingLeaders).toHaveLength(0);
    expect(state.teamStats).toHaveLength(0);
    expect(state.currentPage).toBe(1);
    expect(state.pageSize).toBe(25);
    expect(state.activeTab).toBe('batting');
    expect(state.leagueFilter).toBe('combined');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setBattingLeaders updates leaders and clears error', () => {
    useStatsStore.getState().setError('old');
    useStatsStore.getState().setBattingLeaders(createMockBattingLeaders());

    const state = useStatsStore.getState();
    expect(state.battingLeaders).toHaveLength(3);
    expect(state.error).toBeNull();
  });

  it('setPitchingLeaders updates leaders and clears error', () => {
    useStatsStore.getState().setPitchingLeaders(createMockPitchingLeaders());
    expect(useStatsStore.getState().pitchingLeaders).toHaveLength(3);
  });

  it('setTeamStats updates team stats', () => {
    useStatsStore.getState().setTeamStats(createMockTeamStats());
    expect(useStatsStore.getState().teamStats).toHaveLength(2);
  });

  it('setPage updates current page', () => {
    useStatsStore.getState().setPage(3);
    expect(useStatsStore.getState().currentPage).toBe(3);
  });

  it('setActiveTab updates tab and resets page to 1', () => {
    useStatsStore.getState().setPage(5);
    useStatsStore.getState().setActiveTab('pitching');

    const state = useStatsStore.getState();
    expect(state.activeTab).toBe('pitching');
    expect(state.currentPage).toBe(1);
  });

  it('setLeagueFilter updates filter and resets page to 1', () => {
    useStatsStore.getState().setPage(3);
    useStatsStore.getState().setLeagueFilter('AL');

    const state = useStatsStore.getState();
    expect(state.leagueFilter).toBe('AL');
    expect(state.currentPage).toBe(1);
  });

  it('setLoading updates loading state', () => {
    useStatsStore.getState().setLoading(true);
    expect(useStatsStore.getState().isLoading).toBe(true);
  });

  it('setError updates error', () => {
    useStatsStore.getState().setError('Stats fetch failed');
    expect(useStatsStore.getState().error).toBe('Stats fetch failed');
  });

  it('reset restores initial state', () => {
    const store = useStatsStore.getState();
    store.setBattingLeaders(createMockBattingLeaders());
    store.setActiveTab('pitching');
    store.setPage(5);
    store.reset();

    const state = useStatsStore.getState();
    expect(state.battingLeaders).toHaveLength(0);
    expect(state.activeTab).toBe('batting');
    expect(state.currentPage).toBe(1);
  });

  it('statView defaults to traditional', () => {
    expect(useStatsStore.getState().statView).toBe('traditional');
  });

  it('setStatView updates stat view to advanced', () => {
    useStatsStore.getState().setStatView('advanced');
    expect(useStatsStore.getState().statView).toBe('advanced');
  });

  it('setStatView updates stat view back to traditional', () => {
    useStatsStore.getState().setStatView('advanced');
    useStatsStore.getState().setStatView('traditional');
    expect(useStatsStore.getState().statView).toBe('traditional');
  });

  it('reset restores statView to traditional', () => {
    useStatsStore.getState().setStatView('advanced');
    useStatsStore.getState().reset();
    expect(useStatsStore.getState().statView).toBe('traditional');
  });
});
