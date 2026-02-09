/**
 * useTeam Hook
 *
 * Composes authStore + leagueStore + rosterStore.
 * Finds the team owned by the current user.
 * Separates roster into starters and bench.
 *
 * Layer 5: Hook. Composes stores. Does not import components.
 */

import { useMemo } from 'react';
import { useAuthStore } from '@stores/authStore';
import { useLeagueStore } from '@stores/leagueStore';
import { useRosterStore } from '@stores/rosterStore';

export function useTeam() {
  const user = useAuthStore((s) => s.user);
  const teams = useLeagueStore((s) => s.teams);
  const roster = useRosterStore((s) => s.roster);
  const isRosterLoading = useRosterStore((s) => s.isLoading);
  const rosterError = useRosterStore((s) => s.error);

  const myTeam = useMemo(() => {
    if (!user) return null;
    return teams.find((t) => t.ownerId === user.id) ?? null;
  }, [user, teams]);

  const starters = useMemo(
    () => roster.filter((r) => r.lineupOrder !== null).sort((a, b) => a.lineupOrder! - b.lineupOrder!),
    [roster],
  );

  const bench = useMemo(
    () => roster.filter((r) => r.lineupOrder === null),
    [roster],
  );

  return {
    myTeam,
    roster,
    starters,
    bench,
    isRosterLoading,
    rosterError,
  };
}
