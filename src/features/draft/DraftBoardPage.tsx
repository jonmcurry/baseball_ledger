/**
 * DraftBoardPage
 *
 * Live draft board with pick timer and player pool.
 * 3-panel layout: DraftTicker (left), AvailablePlayersTable (center),
 * RosterPreviewPanel (right). PickTimer at top.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDraft } from '@hooks/useDraft';
import { useLeague } from '@hooks/useLeague';
import { useDraftTimer } from './hooks/useDraftTimer';
import { selectBestAvailable } from '@lib/draft/auto-pick-selector';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { PlayerProfileModal } from '@components/baseball/PlayerProfileModal';
import { DraftTicker } from './DraftTicker';
import { DraftReasoningPanel } from './DraftReasoningPanel';
import { AvailablePlayersTable } from './AvailablePlayersTable';
import { PickTimer } from './PickTimer';
import { RosterPreviewPanel } from './RosterPreviewPanel';
import type { AvailablePlayer } from '@stores/draftStore';
import type { PlayerCard } from '@lib/types/player';
import type { DraftReasoningRequest } from '@lib/types/ai';

export function DraftBoardPage() {
  const { league } = useLeague();
  const {
    draftState,
    availablePlayers,
    isLoading,
    error,
    myTeam,
    isMyPick,
    currentTeamName,
    timeRemaining,
    submitPick,
    fetchDraftState,
    fetchAvailablePlayers,
    tickTimer,
    resetTimer,
  } = useDraft();

  useEffect(() => {
    if (league?.id) {
      fetchDraftState(league.id);
      fetchAvailablePlayers(league.id);
    }
  }, [league?.id, fetchDraftState, fetchAvailablePlayers]);

  // REQ-DFT-004: Auto-pick on timer expiry
  const handleAutoPickOnExpire = useCallback(() => {
    if (!league?.id || availablePlayers.length === 0) return;
    const bestIdx = selectBestAvailable(availablePlayers);
    if (bestIdx >= 0) {
      submitPick(league.id, availablePlayers[bestIdx]);
    }
  }, [league?.id, availablePlayers, submitPick]);

  // REQ-DFT-004: 60-second pick timer
  useDraftTimer({
    isActive: isMyPick && draftState?.status === 'in_progress',
    currentTeamId: draftState?.currentTeamId ?? null,
    pickTimerSeconds: timeRemaining,
    tickTimer,
    resetTimer,
    onExpire: handleAutoPickOnExpire,
  });

  if (isLoading) {
    return <LoadingLedger message="Loading draft board..." />;
  }

  const [profilePlayer, setProfilePlayer] = useState<PlayerCard | null>(null);

  const handlePlayerClick = (player: AvailablePlayer) => {
    setProfilePlayer(player.playerCard);
  };

  const handlePlayerSelect = (player: AvailablePlayer) => {
    if (!league?.id || !myTeam) return;
    submitPick(league.id, player);
  };

  const isDraftComplete = draftState?.status === 'completed';
  const isDraftNotStarted = !draftState || draftState.status === 'not_started';
  const isDraftActive = draftState?.status === 'in_progress';

  // Build reasoning request from the last completed pick
  const lastPickRequest = useMemo((): DraftReasoningRequest | null => {
    const picks = draftState?.picks;
    if (!picks || picks.length === 0) return null;
    const lastPick = picks[picks.length - 1];
    return {
      round: lastPick.round,
      managerStyle: 'balanced',
      managerName: 'Manager',
      teamName: currentTeamName ?? 'Team',
      pickedPlayerName: lastPick.playerName,
      pickedPlayerPosition: lastPick.position,
      pickedPlayerValue: 50,
      alternativePlayers: availablePlayers.slice(0, 3).map((p) => ({
        name: `${p.playerCard.nameFirst} ${p.playerCard.nameLast}`,
        position: p.playerCard.eligiblePositions?.[0] ?? 'UT',
        value: 50,
      })),
      teamNeeds: [],
    };
  }, [draftState?.picks, currentTeamName, availablePlayers]);

  return (
    <div className="space-y-gutter-lg">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-bold text-ballpark">Draft Board</h2>
        {isDraftActive && (
          <PickTimer timeRemaining={timeRemaining} isActive={isMyPick} />
        )}
      </div>

      {error && <ErrorBanner severity="error" message={error} />}

      {isDraftComplete && (
        <div className="rounded-card border border-ballpark bg-ballpark/10 px-gutter py-3">
          <p className="font-headline text-sm font-bold text-ballpark">Draft Complete</p>
          <p className="text-xs text-muted">All {draftState.totalRounds} rounds have been completed.</p>
        </div>
      )}

      {isDraftNotStarted && (
        <div className="rounded-card border border-sandstone bg-old-lace px-gutter py-3">
          <p className="font-headline text-sm font-bold text-ink">Waiting for Draft</p>
          <p className="text-xs text-muted">The commissioner has not started the draft yet.</p>
        </div>
      )}

      {isDraftActive && (
        <div className={`rounded-card border px-gutter py-2 text-sm ${
          isMyPick
            ? 'border-ballpark bg-ballpark/10 font-bold text-ballpark'
            : 'border-sandstone bg-old-lace text-ink'
        }`}>
          {isMyPick
            ? 'Your turn to pick!'
            : `Waiting for ${currentTeamName ?? 'next team'}...`
          }
          <span className="ml-2 text-xs text-muted">
            Round {draftState.currentRound}, Pick {draftState.currentPick}
          </span>
        </div>
      )}

      <div className="grid gap-gutter lg:grid-cols-12">
        <div className="lg:col-span-3 space-y-3">
          <DraftTicker
            picks={draftState?.picks ?? []}
            currentPick={draftState?.currentPick ?? 0}
          />
          <DraftReasoningPanel request={lastPickRequest} />
        </div>

        <div className="lg:col-span-6">
          <AvailablePlayersTable
            players={availablePlayers}
            onSelect={handlePlayerSelect}
            onPlayerClick={handlePlayerClick}
            disabled={!isMyPick}
          />
        </div>

        <div className="lg:col-span-3">
          {myTeam && (
            <RosterPreviewPanel
              picks={draftState?.picks ?? []}
              teamName={`${myTeam.city} ${myTeam.name}`}
              teamId={myTeam.id}
            />
          )}
        </div>
      </div>

      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          isOpen={true}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}

export default DraftBoardPage;
