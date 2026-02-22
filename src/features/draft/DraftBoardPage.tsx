/**
 * DraftBoardPage
 *
 * Heritage Editorial draft board. 3-panel layout: DraftTicker (left),
 * AvailablePlayersTable (center), RosterPreviewPanel (right).
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDraft } from '@hooks/useDraft';
import { useLeague } from '@hooks/useLeague';
import { useDraftTimer } from './hooks/useDraftTimer';

import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { SectionOpener } from '@components/typography/SectionOpener';
import { PlayerProfileModal } from '@components/baseball/PlayerProfileModal';
import { DraftTicker } from './DraftTicker';
import { DraftReasoningPanel } from './DraftReasoningPanel';
import { AvailablePlayersTable } from './AvailablePlayersTable';
import type { PlayerTableFilters, DraftViewMode } from './AvailablePlayersTable';
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
    triggerAutoPick,
    autoDraftEnabled,
    setAutoDraftEnabled,
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

  // REQ-DFT-004: Auto-pick on timer expiry (server-side valuation-based pick)
  const handleAutoPickOnExpire = useCallback(() => {
    if (!league?.id) return;
    triggerAutoPick(league.id, true);
  }, [league?.id, triggerAutoPick]);

  // Auto-draft: fire auto-pick immediately when it becomes the user's turn
  useEffect(() => {
    if (!league?.id || !isMyPick || !autoDraftEnabled || isLoading) return;
    if (draftState?.status !== 'in_progress') return;
    const timeout = setTimeout(() => {
      triggerAutoPick(league.id, true);
    }, 500);
    return () => clearTimeout(timeout);
  }, [isMyPick, autoDraftEnabled, league?.id, draftState?.status, isLoading, triggerAutoPick]);

  const handleFilterChange = useCallback((filters: PlayerTableFilters) => {
    if (!league?.id) return;
    fetchAvailablePlayers(league.id, filters);
  }, [league?.id, fetchAvailablePlayers]);

  const [profilePlayer, setProfilePlayer] = useState<PlayerCard | null>(null);
  const [draftViewMode, setDraftViewMode] = useState<DraftViewMode>('registry');

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

  // REQ-DFT-004: 60-second pick timer (disabled when auto-draft is active)
  useDraftTimer({
    isActive: isMyPick && draftState?.status === 'in_progress' && !autoDraftEnabled,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <SectionOpener
          kicker="The Pressroom"
          headline="Player Draft"
          deck={isDraftActive ? `Round ${draftState.currentRound}, Pick ${draftState.currentPick}` : undefined}
          className="mb-0"
        />

        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <button
            type="button"
            onClick={() => setDraftViewMode((v) => v === 'registry' ? 'classifieds' : 'registry')}
            className="border border-[var(--border-default)] px-3 py-1.5 font-stat text-[10px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-secondary)] hover:text-[var(--text-primary)]"
            aria-label={`Switch to ${draftViewMode === 'registry' ? 'classifieds' : 'registry'} view`}
          >
            {draftViewMode === 'registry' ? 'Classifieds' : 'Registry'}
          </button>

        {isDraftActive && (
          <>
            <button
              type="button"
              onClick={() => setAutoDraftEnabled(!autoDraftEnabled)}
              className={`vintage-card flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                autoDraftEnabled
                  ? 'border-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]'
                  : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              aria-pressed={autoDraftEnabled}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Auto-Draft {autoDraftEnabled ? 'ON' : 'OFF'}
            </button>
            <PickTimer timeRemaining={timeRemaining} isActive={isMyPick && !autoDraftEnabled} />
          </>
        )}
        </div>
      </div>

      {error && <ErrorBanner severity="error" message={error} />}

      {/* Draft status banners */}
      {isDraftComplete && (
        <div
          className="vintage-card"
          style={{ borderLeft: '3px solid var(--accent-secondary)' }}
        >
          <p className="font-headline text-lg font-bold text-[var(--text-primary)]">
            Draft Complete
          </p>
          <p className="font-body text-sm text-[var(--text-secondary)]">
            All {draftState.totalRounds} rounds have been completed. The rosters are set!
          </p>
        </div>
      )}

      {isDraftNotStarted && (
        <div className="vintage-card">
          <p className="font-headline text-sm font-bold text-[var(--text-primary)]">
            Waiting for Draft
          </p>
          <p className="font-body text-xs text-[var(--text-secondary)]">
            The commissioner has not started the draft yet.
          </p>
        </div>
      )}

      {isDraftActive && (
        <div
          className={`vintage-card flex items-center gap-3 ${
            isMyPick
              ? 'border-l-[3px] border-l-[var(--accent-secondary)]'
              : ''
          }`}
        >
          <div>
            <p
              className={`font-headline text-sm font-bold ${
                isMyPick ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {isMyPick
                ? (autoDraftEnabled ? 'Auto-Drafting...' : "You're On the Clock!")
                : `Waiting for ${currentTeamName ?? 'next team'}...`}
            </p>
            <p className="font-stat text-xs text-[var(--text-secondary)]">
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
            disabled={!isMyPick || autoDraftEnabled}
            viewMode={draftViewMode}
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
