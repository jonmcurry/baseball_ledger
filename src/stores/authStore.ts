/**
 * Auth Store
 *
 * REQ-STATE-001: Authentication state management.
 * Tracks user, session, initialization status, and errors.
 *
 * Uses devtools middleware only (no persist -- sessions managed by Supabase).
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getSupabaseClient } from '@lib/supabase/client';
import { useLeagueStore } from './leagueStore';
import { useRosterStore } from './rosterStore';
import { useStatsStore } from './statsStore';
import { useSimulationStore } from './simulationStore';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isInitialized: boolean;
  error: string | null;
}

export interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession | null) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  session: null,
  isInitialized: false,
  error: null,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user, error: null }, false, 'setUser'),

      setSession: (session) => set({ session }, false, 'setSession'),

      setInitialized: (isInitialized) =>
        set({ isInitialized }, false, 'setInitialized'),

      setError: (error) => set({ error }, false, 'setError'),

      logout: () => {
        set({ user: null, session: null, error: null }, false, 'logout');
        // REQ-STATE-011: Full state reset on all stores when user logs out
        useLeagueStore.getState().reset();
        useRosterStore.getState().reset();
        useStatsStore.getState().reset();
        useSimulationStore.getState().reset();
      },

      initialize: async () => {
        try {
          const supabase = getSupabaseClient();
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const u = data.session.user;
            set({
              user: {
                id: u.id,
                email: u.email ?? '',
                displayName: u.user_metadata?.display_name ?? u.email ?? '',
              },
              session: {
                accessToken: data.session.access_token,
                expiresAt: data.session.expires_at ?? 0,
              },
              isInitialized: true,
            }, false, 'initialize');
          } else {
            set({ isInitialized: true }, false, 'initialize/no-session');
          }

          supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              const u = session.user;
              set({
                user: {
                  id: u.id,
                  email: u.email ?? '',
                  displayName: u.user_metadata?.display_name ?? u.email ?? '',
                },
                session: {
                  accessToken: session.access_token,
                  expiresAt: session.expires_at ?? 0,
                },
              }, false, 'authStateChange');
            } else {
              set({ user: null, session: null }, false, 'authStateChange/signout');
            }
          });
        } catch (err) {
          set({
            isInitialized: true,
            error: err instanceof Error ? err.message : 'Auth initialization failed',
          }, false, 'initialize/error');
        }
      },
    }),
    { name: 'AuthStore', enabled: import.meta.env.DEV },
  ),
);
