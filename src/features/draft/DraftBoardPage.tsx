/**
 * DraftBoardPage
 *
 * Live draft board with vintage ballpark scoreboard aesthetic.
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
import type { PlayerTableFilters } from './AvailablePlayersTable';
import { PickTimer } from './PickTimer';
import { RosterPreviewPanel } from './RosterPreviewPanel';
import type { AvailablePlayer } from '@stores/draftStore';
import type { PlayerCard } from '@lib/types/player';
import type { DraftReasoningRequest } from '@lib/types/ai';
import { usePageTitle } from '@hooks/usePageTitle';

export function DraftBoardPage() {
  usePageTitle('Draft Board');
  const { league } = useLeague();
  const {
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

  // Poll draft state when it is not the user's turn (CPU picks processed server-side)
  useEffect(() => {
    if (!league?.id || !draftState || draftState.status !== 'in_progress' || isMyPick) return;
    const interval = setInterval(() => {
      fetchDraftState(league.id);
      fetchAvailablePlayers(league.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [league?.id, draftState?.status, isMyPick, fetchDraftState, fetchAvailablePlayers]);

  // REQ-DFT-004: Auto-pick on timer expiry
  const handleAutoPickOnExpire = useCallback(() => {
    if (!league?.id || availablePlayers.length === 0) return;
    const bestIdx = selectBestAvailable(availablePlayers);
    if (bestIdx >= 0) {
      submitPick(league.id, availablePlayers[bestIdx]);
    }
  }, [league?.id, availablePlayers, submitPick]);

  const handleFilterChange = useCallback((filters: PlayerTableFilters) => {
    if (!league?.id) return;
    fetchAvailablePlayers(league.id, filters);
  }, [league?.id, fetchAvailablePlayers]);

  const [profilePlayer, setProfilePlayer] = useState<PlayerCard | null>(null);

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

  // REQ-DFT-004: 60-second pick timer
  useDraftTimer({
    isActive: isMyPick && draftState?.status === 'in_progress',
    currentTeamId: draftState?.currentTeamId ?? null,
    pickTimerSeconds: timeRemaining,
    tickTimer,
    resetTimer,
    onExpire: handleAutoPickOnExpire,
  });

  if (isLoading && !draftState && availablePlayers.length === 0) {
    return <LoadingLedger message="Loading draft board..." />;
  }

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

  return (
    <div className="space-y-gutter-lg">
      {/* Header with pennant styling */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Decorative baseball */}
          <div
            className="hidden h-12 w-12 items-center justify-center rounded-full md:flex"
            style={{
              background: 'linear-gradient(135deg, var(--color-cream) 0%, #E8DCC8 100%)',
              border: '2px solid var(--color-stitch)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <svg
              className="h-6 w-6 text-[var(--color-stitch)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM5.5 16.5c-.83-.73-1.5-1.63-1.96-2.64.3-.07.65-.11 1.01-.11 1.07 0 2.18.36 3.21 1.04-.46.61-.85 1.18-1.15 1.71h-1.1zM5.04 10.14c.46-.08.95-.14 1.46-.14 1.63 0 3.36.58 4.89 1.64-1.13.85-2.1 1.89-2.83 3.08-1.03-.68-2.14-1.04-3.21-1.04-.36 0-.71.04-1.01.11-.21-.56-.38-1.15-.47-1.76.33-.07.75-.11 1.17-.11v-1.78zm13.46 6.36c-.46.08-.95.14-1.46.14-1.63 0-3.36-.58-4.89-1.64 1.13-.85 2.1-1.89 2.83-3.08 1.03.68 2.14 1.04 3.21 1.04.36 0 .71-.04 1.01-.11.21.56.38 1.15.47 1.76-.33.07-.75.11-1.17.11v1.78z" />
            </svg>
          </div>

          <div>
            <h2 className="pennant-header">Draft Board</h2>
            {isDraftActive && (
              <p className="font-stat text-sm text-[var(--color-muted)]">
                Round {draftState.currentRound}, Pick {draftState.currentPick}
              </p>
            )}
          </div>
        </div>

        {isDraftActive && (
          <PickTimer timeRemaining={timeRemaining} isActive={isMyPick} />
        )}
      </div>

      {error && <ErrorBanner severity="error" message={error} />}

      {/* Draft status banners */}
      {isDraftComplete && (
        <div
          className="vintage-card relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--color-leather) 0%, var(--color-leather-dark) 100%)',
            borderColor: 'var(--color-gold)',
          }}
        >
          <div className="absolute right-0 top-0 h-20 w-20 opacity-10">
            <svg fill="var(--color-gold)" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <div className="relative">
            <p className="font-headline text-lg font-bold uppercase tracking-wider text-[var(--color-gold)]">
              Draft Complete
            </p>
            <p className="font-stat text-sm text-[var(--color-cream)]/80">
              All {draftState.totalRounds} rounds have been completed. The rosters are set!
            </p>
          </div>
        </div>
      )}

      {isDraftNotStarted && (
        <div className="vintage-card border-[var(--color-sandstone)]">
          <p className="font-headline text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">
            Waiting for Draft
          </p>
          <p className="font-stat text-xs text-[var(--color-muted)]">
            The commissioner has not started the draft yet.
          </p>
        </div>
      )}

      {isDraftActive && (
        <div
          className={`vintage-card flex items-center gap-3 ${
            isMyPick
              ? 'animate-glow border-[var(--color-gold)] bg-gradient-to-r from-[var(--color-gold)]/20 to-[var(--color-gold)]/10'
              : 'border-[var(--color-sandstone)]'
          }`}
        >
          {isMyPick && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-gold)]">
              <svg
                className="h-5 w-5 text-[var(--color-ink)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          )}
          <div>
            <p
              className={`font-headline text-sm font-bold uppercase tracking-wider ${
                isMyPick ? 'text-[var(--color-gold)]' : 'text-[var(--color-ink)]'
              }`}
            >
              {isMyPick ? "You're On the Clock!" : `Waiting for ${currentTeamName ?? 'next team'}...`}
            </p>
            <p className="font-stat text-xs text-[var(--color-muted)]">
              Round {draftState.currentRound}, Pick {draftState.currentPick}
            </p>
          </div>
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="grid gap-gutter md:grid-cols-12">
        {/* Left column: Draft Ticker + Reasoning */}
        <div className="space-y-gutter md:col-span-3">
          <DraftTicker
            picks={draftState?.picks ?? []}
            currentPick={draftState?.currentPick ?? 0}
          />
          <DraftReasoningPanel request={lastPickRequest} />
        </div>

        {/* Center column: Player Pool */}
        <div className="md:col-span-6">
          <AvailablePlayersTable
            players={availablePlayers}
            totalAvailable={totalAvailablePlayers}
            currentPage={playerCurrentPage}
            pageSize={playerPageSize}
            onSelect={handlePlayerSelect}
            onPlayerClick={handlePlayerClick}
            onFilterChange={handleFilterChange}
            disabled={!isMyPick}
          />
        </div>

        {/* Right column: Roster Preview */}
        <div className="md:col-span-3">
          {myTeam && (
            <RosterPreviewPanel
              picks={draftState?.picks ?? []}
              teamName={`${myTeam.city} ${myTeam.name}`}
              teamId={myTeam.id}
            />
          )}
        </div>
      </div>

      {/* Player Profile Modal */}
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
