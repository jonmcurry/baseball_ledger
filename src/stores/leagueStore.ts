/**
 * League Store
 *
 * REQ-STATE-002 through REQ-STATE-008: League, team, standings, schedule state.
 * Persisted to localStorage. Uses immer for immutable state updates.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { LeagueSummary, TeamSummary, DivisionStandings } from '@lib/types/league';
import type { ScheduleDay } from '@lib/types/schedule';
import { createSafeStorage } from './storage-factory';

export interface LeagueState {
  activeLeagueId: string | null;
  league: LeagueSummary | null;
  teams: TeamSummary[];
  standings: DivisionStandings[];
  schedule: ScheduleDay[];
  currentDay: number;
  isLoading: boolean;
  error: string | null;
}

export interface LeagueActions {
  setActiveLeague: (league: LeagueSummary) => void;
  setTeams: (teams: TeamSummary[]) => void;
  setStandings: (standings: DivisionStandings[]) => void;
  setSchedule: (schedule: ScheduleDay[]) => void;
  setCurrentDay: (day: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateTeamRecord: (teamId: string, wins: number, losses: number) => void;
  reset: () => void;
}

export type LeagueStore = LeagueState & LeagueActions;

const initialState: LeagueState = {
  activeLeagueId: null,
  league: null,
  teams: [],
  standings: [],
  schedule: [],
  currentDay: 0,
  isLoading: false,
  error: null,
};

export const useLeagueStore = create<LeagueStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        setActiveLeague: (league) =>
          set(
            (state) => {
              state.activeLeagueId = league.id;
              state.league = league;
              state.currentDay = league.currentDay;
              state.error = null;
            },
            false,
            'setActiveLeague',
          ),

        setTeams: (teams) =>
          set(
            (state) => {
              state.teams = teams;
            },
            false,
            'setTeams',
          ),

        setStandings: (standings) =>
          set(
            (state) => {
              state.standings = standings;
            },
            false,
            'setStandings',
          ),

        setSchedule: (schedule) =>
          set(
            (state) => {
              state.schedule = schedule;
            },
            false,
            'setSchedule',
          ),

        setCurrentDay: (day) =>
          set(
            (state) => {
              state.currentDay = day;
            },
            false,
            'setCurrentDay',
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

        updateTeamRecord: (teamId, wins, losses) =>
          set(
            (state) => {
              const team = state.teams.find((t) => t.id === teamId);
              if (team) {
                team.wins = wins;
                team.losses = losses;
              }
            },
            false,
            'updateTeamRecord',
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
        name: 'bl-league-v1',
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
          activeLeagueId: state.activeLeagueId,
          currentDay: state.currentDay,
        } as LeagueStore),
      },
    ),
    { name: 'LeagueStore' },
  ),
);
