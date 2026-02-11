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
import type { ScheduleDay, FullPlayoffBracket } from '@lib/types/schedule';
import * as leagueService from '@services/league-service';
import { createSafeStorage } from './storage-factory';
import { createMigrationConfig } from './persist-migration';

export interface LeagueState {
  activeLeagueId: string | null;
  league: LeagueSummary | null;
  teams: TeamSummary[];
  standings: DivisionStandings[];
  schedule: ScheduleDay[];
  playoffBracket: FullPlayoffBracket | null;
  currentDay: number;
  isLoading: boolean;
  error: string | null;
}

export interface LeagueActions {
  setActiveLeague: (league: LeagueSummary) => void;
  setTeams: (teams: TeamSummary[]) => void;
  setStandings: (standings: DivisionStandings[]) => void;
  setSchedule: (schedule: ScheduleDay[]) => void;
  setPlayoffBracket: (bracket: FullPlayoffBracket | null) => void;
  setCurrentDay: (day: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateTeamRecord: (teamId: string, wins: number, losses: number) => void;
  reset: () => void;
  fetchLeagueData: (id: string) => Promise<void>;
  fetchStandings: (id: string) => Promise<void>;
  fetchSchedule: (id: string, day?: number) => Promise<void>;
}

export type LeagueStore = LeagueState & LeagueActions;

const initialState: LeagueState = {
  activeLeagueId: null,
  league: null,
  teams: [],
  standings: [],
  schedule: [],
  playoffBracket: null,
  currentDay: 0,
  isLoading: false,
  error: null,
};

export const useLeagueStore = create<LeagueStore>()(
  devtools(
    persist(
      immer((set, _get) => ({
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

        setPlayoffBracket: (bracket) =>
          set(
            (state) => {
              state.playoffBracket = bracket;
            },
            false,
            'setPlayoffBracket',
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

        fetchLeagueData: async (id) => {
          set((state) => { state.isLoading = true; state.error = null; }, false, 'fetchLeagueData/start');
          try {
            const [league, teams, standings, schedule] = await Promise.all([
              leagueService.fetchLeague(id),
              leagueService.fetchTeams(id),
              leagueService.fetchStandings(id),
              leagueService.fetchSchedule(id),
            ]);
            set((state) => {
              state.activeLeagueId = id;
              state.league = league;
              state.teams = teams;
              state.standings = standings;
              state.schedule = schedule;
              state.playoffBracket = league.playoffBracket ?? null;
              state.currentDay = league.currentDay;
              state.isLoading = false;
            }, false, 'fetchLeagueData/success');
          } catch (err) {
            set((state) => {
              state.isLoading = false;
              state.error = err instanceof Error ? err.message : String((err as { message?: string }).message ?? 'Failed to fetch league data');
            }, false, 'fetchLeagueData/error');
          }
        },

        fetchStandings: async (id) => {
          try {
            const standings = await leagueService.fetchStandings(id);
            set((state) => { state.standings = standings; }, false, 'fetchStandings');
          } catch (err) {
            set((state) => {
              state.error = err instanceof Error ? err.message : 'Failed to fetch standings';
            }, false, 'fetchStandings/error');
          }
        },

        fetchSchedule: async (id, day) => {
          try {
            const schedule = await leagueService.fetchSchedule(id, day);
            set((state) => { state.schedule = schedule; }, false, 'fetchSchedule');
          } catch (err) {
            set((state) => {
              state.error = err instanceof Error ? err.message : 'Failed to fetch schedule';
            }, false, 'fetchSchedule/error');
          }
        },
      })),
      {
        name: 'bl-league-v1',
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
          activeLeagueId: state.activeLeagueId,
          currentDay: state.currentDay,
        } as LeagueStore),
      },
    ),
    { name: 'LeagueStore', enabled: import.meta.env.DEV },
  ),
);
