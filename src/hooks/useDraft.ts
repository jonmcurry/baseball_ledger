/**
 * useDraft Hook
 *
 * Composes authStore + leagueStore + draftStore.
 * Derives isMyPick and timeRemaining for the draft board.
 *
 * Layer 5: Hook. Composes stores. Does not import components.
 */

import { useMemo } from 'react';
import { useAuthStore } from '@stores/authStore';
import { useLeagueStore } from '@stores/leagueStore';
import { useDraftStore } from '@stores/draftStore';

export function useDraft() {
  const user = useAuthStore((s) => s.user);
  const teams = useLeagueStore((s) => s.teams);
  const draftState = useDraftStore((s) => s.draftState);
  const availablePlayers = useDraftStore((s) => s.availablePlayers);
  const totalAvailablePlayers = useDraftStore((s) => s.totalAvailablePlayers);
  const playerCurrentPage = useDraftStore((s) => s.playerCurrentPage);
  const playerPageSize = useDraftStore((s) => s.playerPageSize);
  const isLoading = useDraftStore((s) => s.isLoading);
  const error = useDraftStore((s) => s.error);
  const pickTimerSeconds = useDraftStore((s) => s.pickTimerSeconds);
  const submitPick = useDraftStore((s) => s.submitPick);
  const fetchDraftState = useDraftStore((s) => s.fetchDraftState);
  const fetchAvailablePlayers = useDraftStore((s) => s.fetchAvailablePlayers);
  const tickTimer = useDraftStore((s) => s.tickTimer);
  const resetTimer = useDraftStore((s) => s.resetTimer);

  const myTeam = useMemo(() => {
    if (!user) return null;
    return teams.find((t) => t.ownerId === user.id) ?? null;
  }, [user, teams]);

  const isMyPick = useMemo(() => {
    if (!myTeam || !draftState) return false;
    return draftState.currentTeamId === myTeam.id;
  }, [myTeam, draftState]);

  const currentTeamName = useMemo(() => {
    if (!draftState?.currentTeamId) return null;
    const team = teams.find((t) => t.id === draftState.currentTeamId);
    return team ? `${team.city} ${team.name}` : null;
  }, [draftState, teams]);

  return {
    draftState,
    availablePlayers,
    totalAvailablePlayers,
    playerCurrentPage,
    playerPageSize,
    isLoading,
    error,
    myTeam,
    isMyPick,
    currentTeamName,
    timeRemaining: pickTimerSeconds,
    submitPick,
    fetchDraftState,
    fetchAvailablePlayers,
    tickTimer,
    resetTimer,
  };
}
