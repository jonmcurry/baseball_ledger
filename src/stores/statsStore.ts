/**
 * Stats Store
 *
 * REQ-STATE-015 through REQ-STATE-016: Statistics leaders and team stats.
 * Persisted to localStorage for offline viewing.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { BattingLeaderEntry, PitchingLeaderEntry, TeamAggregateStats } from '@lib/stats/leaders';
import * as statsService from '@services/stats-service';
import { createSafeStorage } from './storage-factory';
import { createMigrationConfig } from './persist-migration';

export type StatView = 'traditional' | 'advanced';

export interface StatsState {
  battingLeaders: BattingLeaderEntry[];
  pitchingLeaders: PitchingLeaderEntry[];
  teamStats: TeamAggregateStats[];
  currentPage: number;
  pageSize: number;
  activeTab: 'batting' | 'pitching';
  leagueFilter: 'AL' | 'NL' | 'combined';
  statView: StatView;
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
  setStatView: (view: StatView) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  fetchBattingLeaders: (leagueId: string) => Promise<void>;
  fetchPitchingLeaders: (leagueId: string) => Promise<void>;
  fetchTeamStats: (leagueId: string) => Promise<void>;
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
  statView: 'traditional',
  isLoading: false,
  error: null,
};

export const useStatsStore = create<StatsStore>()(
  devtools(
    persist(
      (set, get) => ({
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

        setStatView: (view) =>
          set({ statView: view }, false, 'setStatView'),

        setLoading: (loading) =>
          set({ isLoading: loading }, false, 'setLoading'),

        setError: (error) =>
          set({ error }, false, 'setError'),

        reset: () => set(initialState, false, 'reset'),

        fetchBattingLeaders: async (leagueId) => {
          set({ isLoading: true, error: null }, false, 'fetchBattingLeaders/start');
          try {
            const page = get().currentPage;
            const response = await statsService.fetchBattingLeaders(leagueId, page);
            set({ battingLeaders: response.data, isLoading: false }, false, 'fetchBattingLeaders/success');
          } catch (err) {
            set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to fetch batting leaders' }, false, 'fetchBattingLeaders/error');
          }
        },

        fetchPitchingLeaders: async (leagueId) => {
          set({ isLoading: true, error: null }, false, 'fetchPitchingLeaders/start');
          try {
            const page = get().currentPage;
            const response = await statsService.fetchPitchingLeaders(leagueId, page);
            set({ pitchingLeaders: response.data, isLoading: false }, false, 'fetchPitchingLeaders/success');
          } catch (err) {
            set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to fetch pitching leaders' }, false, 'fetchPitchingLeaders/error');
          }
        },

        fetchTeamStats: async (leagueId) => {
          try {
            const teamStats = await statsService.fetchTeamStats(leagueId);
            set({ teamStats }, false, 'fetchTeamStats');
          } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch team stats' }, false, 'fetchTeamStats/error');
          }
        },
      }),
      {
        name: 'bl-stats-v1',
        ...createMigrationConfig(1, initialState),
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
          statView: state.statView,
          pageSize: state.pageSize,
        } as StatsStore),
      },
    ),
    { name: 'StatsStore' },
  ),
);
