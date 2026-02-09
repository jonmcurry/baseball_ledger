/**
 * useLeague Hook
 *
 * Composes authStore + leagueStore to provide league state and derived values.
 * Determines if current user is commissioner.
 *
 * Layer 5: Hook. Composes stores. Does not import components.
 */

import { useAuthStore } from '@stores/authStore';
import { useLeagueStore } from '@stores/leagueStore';

export function useLeague() {
  const user = useAuthStore((s) => s.user);
  const league = useLeagueStore((s) => s.league);
  const teams = useLeagueStore((s) => s.teams);
  const standings = useLeagueStore((s) => s.standings);
  const schedule = useLeagueStore((s) => s.schedule);
  const currentDay = useLeagueStore((s) => s.currentDay);
  const isLoading = useLeagueStore((s) => s.isLoading);
  const error = useLeagueStore((s) => s.error);

  const isCommissioner = user !== null && league !== null && user.id === league.commissionerId;
  const leagueStatus = league?.status ?? null;

  return {
    league,
    teams,
    standings,
    schedule,
    currentDay,
    isLoading,
    error,
    isCommissioner,
    leagueStatus,
  };
}
