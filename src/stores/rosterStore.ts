/**
 * Roster Store
 *
 * REQ-STATE-009 through REQ-STATE-011: Roster and lineup state.
 * Persisted to localStorage. Uses immer for immutable state updates.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { RosterEntry } from '@lib/types/roster';
import * as rosterService from '@services/roster-service';
import { createSafeStorage } from './storage-factory';
import { createMigrationConfig } from './persist-migration';
import { useStatsStore } from './statsStore';

export interface RosterState {
  activeTeamId: string | null;
  roster: RosterEntry[];
  isStale: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface RosterActions {
  setActiveTeam: (teamId: string) => void;
  setRoster: (roster: RosterEntry[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateRosterSlot: (
    rosterId: string,
    slot: RosterEntry['rosterSlot'],
    lineupOrder: number | null,
    lineupPosition: string | null,
  ) => void;
  swapBattingOrder: (rosterId1: string, rosterId2: string) => void;
  changePitcherRole: (rosterId: string, newSlot: 'rotation' | 'bullpen' | 'closer') => void;
  reset: () => void;
  clearRoster: () => void;
  invalidateRosterCache: (leagueId: string) => void;
  fetchRoster: (leagueId: string, teamId: string) => Promise<void>;
  saveLineup: (leagueId: string, teamId: string) => Promise<void>;
}

export type RosterStore = RosterState & RosterActions;

const initialState: RosterState = {
  activeTeamId: null,
  roster: [],
  isStale: false,
  isLoading: false,
  error: null,
};

export const useRosterStore = create<RosterStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setActiveTeam: (teamId) =>
          set(
            (state) => {
              state.activeTeamId = teamId;
            },
            false,
            'setActiveTeam',
          ),

        setRoster: (roster) =>
          set(
            (state) => {
              state.roster = roster;
              state.error = null;
            },
            false,
            'setRoster',
          ),

        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            'setLoading',
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            'setError',
          ),

        updateRosterSlot: (rosterId, slot, lineupOrder, lineupPosition) =>
          set(
            (state) => {
              const entry = state.roster.find((r) => r.id === rosterId);
              if (entry) {
                entry.rosterSlot = slot;
                entry.lineupOrder = lineupOrder;
                entry.lineupPosition = lineupPosition;
              }
            },
            false,
            'updateRosterSlot',
          ),

        swapBattingOrder: (rosterId1, rosterId2) =>
          set(
            (state) => {
              const entry1 = state.roster.find((r) => r.id === rosterId1);
              const entry2 = state.roster.find((r) => r.id === rosterId2);
              if (entry1 && entry2) {
                const tempOrder = entry1.lineupOrder;
                entry1.lineupOrder = entry2.lineupOrder;
                entry2.lineupOrder = tempOrder;
              }
            },
            false,
            'swapBattingOrder',
          ),

        changePitcherRole: (rosterId, newSlot) =>
          set(
            (state) => {
              const entry = state.roster.find((r) => r.id === rosterId);
              if (!entry) return;
              // If moving to closer, demote current closer to bullpen
              if (newSlot === 'closer') {
                const currentCloser = state.roster.find((r) => r.rosterSlot === 'closer');
                if (currentCloser) {
                  currentCloser.rosterSlot = 'bullpen';
                }
              }
              entry.rosterSlot = newSlot;
              entry.lineupOrder = null;
              entry.lineupPosition = null;
            },
            false,
            'changePitcherRole',
          ),

        reset: () =>
          set(
            (state) => {
              Object.assign(state, initialState);
            },
            false,
            'reset',
          ),

        clearRoster: () =>
          set(
            (state) => {
              Object.assign(state, initialState);
            },
            false,
            'clearRoster',
          ),

        invalidateRosterCache: (leagueId) => {
          const teamId = get().activeTeamId;
          if (!teamId) return;
          set((state) => { state.isStale = true; }, false, 'invalidateRosterCache');
          get().fetchRoster(leagueId, teamId);
        },

        fetchRoster: async (leagueId, teamId) => {
          set((state) => { state.isLoading = true; state.error = null; }, false, 'fetchRoster/start');
          try {
            const roster = await rosterService.fetchRoster(leagueId, teamId);
            set((state) => {
              state.activeTeamId = teamId;
              state.roster = roster;
              state.isStale = false;
              state.isLoading = false;
            }, false, 'fetchRoster/success');
          } catch (err) {
            set((state) => {
              state.isLoading = false;
              state.error = err instanceof Error ? err.message : 'Failed to fetch roster';
            }, false, 'fetchRoster/error');
          }
        },

        saveLineup: async (leagueId, teamId) => {
          set((state) => { state.isLoading = true; state.error = null; }, false, 'saveLineup/start');
          try {
            const updates = get().roster.map((entry) => ({
              rosterId: entry.id,
              lineupOrder: entry.lineupOrder,
              lineupPosition: entry.lineupPosition,
              rosterSlot: entry.rosterSlot,
            }));
            await rosterService.updateLineup(leagueId, teamId, updates);
            set((state) => { state.isLoading = false; }, false, 'saveLineup/success');
            // REQ-STATE-011: Invalidate stats cache after roster change
            useStatsStore.getState().invalidateStatsCache(leagueId);
          } catch (err) {
            set((state) => {
              state.isLoading = false;
              state.error = err instanceof Error ? err.message : 'Failed to save lineup';
            }, false, 'saveLineup/error');
          }
        },
      })),
      {
        name: 'bl-roster-v1',
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
          activeTeamId: state.activeTeamId,
        } as RosterStore),
      },
    ),
    { name: 'RosterStore', enabled: import.meta.env.DEV },
  ),
);
