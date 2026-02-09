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

      logout: () =>
        set({ user: null, session: null, error: null }, false, 'logout'),
    }),
    { name: 'AuthStore' },
  ),
);
