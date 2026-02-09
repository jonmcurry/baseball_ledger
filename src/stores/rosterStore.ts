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
import { createSafeStorage } from './storage-factory';

export interface RosterState {
  activeTeamId: string | null;
  roster: RosterEntry[];
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
  reset: () => void;
}

export type RosterStore = RosterState & RosterActions;

const initialState: RosterState = {
  activeTeamId: null,
  roster: [],
  isLoading: false,
  error: null,
};

export const useRosterStore = create<RosterStore>()(
  devtools(
    persist(
      immer((set) => ({
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

        reset: () =>
          set(
            (state) => {
              Object.assign(state, initialState);
            },
            false,
            'reset',
          ),
      })),
      {
        name: 'bl-roster-v1',
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
    { name: 'RosterStore' },
  ),
);
