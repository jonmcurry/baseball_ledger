/**
 * Stats Store
 *
 * REQ-STATE-015 through REQ-STATE-016: Statistics leaders and team stats.
 * Persisted to localStorage for offline viewing.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { BattingLeaderEntry, PitchingLeaderEntry, TeamAggregateStats } from '@lib/stats/leaders';
import { createSafeStorage } from './storage-factory';

export interface StatsState {
  battingLeaders: BattingLeaderEntry[];
  pitchingLeaders: PitchingLeaderEntry[];
  teamStats: TeamAggregateStats[];
  currentPage: number;
  pageSize: number;
  activeTab: 'batting' | 'pitching';
  leagueFilter: 'AL' | 'NL' | 'combined';
  isLoading: boolean;
  error: string | null;
}

export interface StatsActions {
  setBattingLeaders: (leaders: BattingLeaderEntry[]) => void;
  setPitchingLeaders: (leaders: PitchingLeaderEntry[]) => void;
  setTeamStats: (stats: TeamAggregateStats[]) => void;
  setPage: (page: number) => void;
  setActiveTab: (tab: 'batting' | 'pitching') => void;
  setLeagueFilter: (filter: 'AL' | 'NL' | 'combined') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type StatsStore = StatsState & StatsActions;

const initialState: StatsState = {
  battingLeaders: [],
  pitchingLeaders: [],
  teamStats: [],
  currentPage: 1,
  pageSize: 25,
  activeTab: 'batting',
  leagueFilter: 'combined',
  isLoading: false,
  error: null,
};

export const useStatsStore = create<StatsStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setBattingLeaders: (leaders) =>
          set({ battingLeaders: leaders, error: null }, false, 'setBattingLeaders'),

        setPitchingLeaders: (leaders) =>
          set({ pitchingLeaders: leaders, error: null }, false, 'setPitchingLeaders'),

        setTeamStats: (stats) =>
          set({ teamStats: stats }, false, 'setTeamStats'),

        setPage: (page) =>
          set({ currentPage: page }, false, 'setPage'),

        setActiveTab: (tab) =>
          set({ activeTab: tab, currentPage: 1 }, false, 'setActiveTab'),

        setLeagueFilter: (filter) =>
          set({ leagueFilter: filter, currentPage: 1 }, false, 'setLeagueFilter'),

        setLoading: (loading) =>
          set({ isLoading: loading }, false, 'setLoading'),

        setError: (error) =>
          set({ error }, false, 'setError'),

        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'bl-stats-v1',
        storage: {
          getItem: (name) => {
            const storage = createSafeStorage();
            const value = storage.getItem(name);
            return value ? JSON.parse(value) : null;
          },
          setItem: (name, value) => {
            const storage = createSafeStorage();
            storage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => {
            const storage = createSafeStorage();
            storage.removeItem(name);
          },
        },
        partialize: (state) => ({
          activeTab: state.activeTab,
          leagueFilter: state.leagueFilter,
          pageSize: state.pageSize,
        } as StatsStore),
      },
    ),
    { name: 'StatsStore' },
  ),
);
