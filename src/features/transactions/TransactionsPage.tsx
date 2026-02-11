/**
 * TransactionsPage
 *
 * Player transactions, trades, and waiver wire.
 * Tab layout: Add/Drop, Trade, History.
 * REQ-RST-005: Trade between two teams with player selection.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTeam } from '@hooks/useTeam';
import { useLeague } from '@hooks/useLeague';
import { useRosterStore } from '@stores/rosterStore';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { AddDropForm } from './AddDropForm';
import { TradeForm } from './TradeForm';
import { TradeEvaluationPanel } from './TradeEvaluationPanel';
import { TransactionLog } from './TransactionLog';
import type { TransactionEntry } from './TransactionLog';
import type { TradePlayer, TradePayload } from './TradeForm';
import type { TradeEvaluationRequest } from '@lib/types/ai';
import type { RosterEntry } from '@lib/types/roster';
import type { AvailablePlayer } from '@lib/transforms/player-pool-transform';
import { transformPoolRows } from '@lib/transforms/player-pool-transform';
import * as transactionService from '@services/transaction-service';
import { fetchAvailablePlayers as fetchFreeAgents } from '@services/draft-service';
import { fetchRoster } from '@services/roster-service';

type Tab = 'add-drop' | 'trade' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'add-drop', label: 'Add/Drop' },
  { key: 'trade', label: 'Trade' },
  { key: 'history', label: 'History' },
];

export function TransactionsPage() {
  const { league, teams, isLoading: leagueLoading, error: leagueError } = useLeague();
  const { myTeam, roster, isRosterLoading, rosterError } = useTeam();
  const fetchMyRoster = useRosterStore((s) => s.fetchRoster);
  const [activeTab, setActiveTab] = useState<Tab>('add-drop');
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [targetRoster, setTargetRoster] = useState<TradePlayer[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingTrade, setPendingTrade] = useState<TradePayload | null>(null);
  const [targetRosterEntries, setTargetRosterEntries] = useState<RosterEntry[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

  const leagueId = league?.id;
  const teamId = myTeam?.id;

  // Load transaction history on mount
  useEffect(() => {
    if (!leagueId) return;
    transactionService.fetchTransactionHistory(leagueId)
      .then(setTransactions)
      .catch(() => { /* History fetch is best-effort */ });
  }, [leagueId]);

  const handleDrop = useCallback(async (rosterId: string) => {
    if (!leagueId || !teamId) return;
    setActionError(null);

    // Find the player ID from the roster entry ID
    const entry = roster.find((r) => r.id === rosterId);
    if (!entry) return;

    try {
      await transactionService.dropPlayer(leagueId, teamId, entry.playerId);
      // Refresh roster after drop
      await fetchMyRoster(leagueId, teamId);
      // Refresh history
      transactionService.fetchTransactionHistory(leagueId)
        .then(setTransactions)
        .catch(() => {});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to drop player');
    }
  }, [leagueId, teamId, roster, fetchMyRoster]);

  // REQ-RST-005: Search free agent pool
  const handleSearchPlayers = useCallback(async (search: string) => {
    if (!leagueId || search.length < 2) {
      setAvailablePlayers([]);
      return;
    }
    setIsLoadingPlayers(true);
    try {
      const rows = await fetchFreeAgents(leagueId, { search, pageSize: 20 });
      setAvailablePlayers(transformPoolRows(rows));
    } catch {
      setAvailablePlayers([]);
    } finally {
      setIsLoadingPlayers(false);
    }
  }, [leagueId]);

  // REQ-RST-005: Add a free agent to roster
  const handleAdd = useCallback(async (player: AvailablePlayer) => {
    if (!leagueId || !teamId) return;
    setActionError(null);
    try {
      await transactionService.addPlayer(leagueId, teamId, {
        playerId: player.playerId,
        playerName: `${player.nameFirst} ${player.nameLast}`,
        seasonYear: player.seasonYear,
        playerCard: player.playerCard as unknown as Record<string, unknown>,
      });
      await fetchMyRoster(leagueId, teamId);
      setAvailablePlayers([]);
      transactionService.fetchTransactionHistory(leagueId)
        .then(setTransactions)
        .catch(() => {});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add player');
    }
  }, [leagueId, teamId, fetchMyRoster]);

  const handleTargetChange = useCallback(async (targetTeamId: string) => {
    if (!leagueId) return;
    setTargetRoster([]);
    setTargetRosterEntries([]);
    try {
      const targetEntries = await fetchRoster(leagueId, targetTeamId);
      setTargetRosterEntries(targetEntries);
      setTargetRoster(
        targetEntries.map((r) => ({
          id: r.playerId,
          name: `${r.playerCard.nameFirst} ${r.playerCard.nameLast}`,
        })),
      );
    } catch {
      setTargetRoster([]);
      setTargetRosterEntries([]);
    }
  }, [leagueId]);

  const handleTrade = useCallback(async (payload: {
    targetTeamId: string;
    playersFromMe: string[];
    playersFromThem: string[];
  }) => {
    if (!leagueId || !teamId) return;
    setActionError(null);
    try {
      await transactionService.submitTrade(
        leagueId,
        teamId,
        payload.targetTeamId,
        payload.playersFromMe,
        payload.playersFromThem,
      );
      // Refresh roster after trade
      await fetchMyRoster(leagueId, teamId);
      // Refresh history
      transactionService.fetchTransactionHistory(leagueId)
        .then(setTransactions)
        .catch(() => {});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit trade');
    }
  }, [leagueId, teamId, fetchMyRoster]);

  const handleSelectionChange = useCallback((payload: TradePayload | null) => {
    setPendingTrade(payload);
  }, []);

  const tradeEvalRequest = useMemo((): TradeEvaluationRequest | null => {
    if (!pendingTrade) return null;

    const findMyEntry = (pid: string) => roster.find((r) => r.playerId === pid);
    const findTheirEntry = (pid: string) => targetRosterEntries.find((r) => r.playerId === pid);

    const playersOffered = pendingTrade.playersFromMe.map((pid) => {
      const entry = findMyEntry(pid);
      return {
        name: entry ? `${entry.playerCard.nameFirst} ${entry.playerCard.nameLast}` : pid,
        position: entry?.playerCard.eligiblePositions?.[0] ?? 'UT',
        value: entry?.playerCard.card?.reduce((a: number, b: number) => a + b, 0) ?? 50,
      };
    });

    const playersRequested = pendingTrade.playersFromThem.map((pid) => {
      const entry = findTheirEntry(pid);
      return {
        name: entry ? `${entry.playerCard.nameFirst} ${entry.playerCard.nameLast}` : pid,
        position: entry?.playerCard.eligiblePositions?.[0] ?? 'UT',
        value: entry?.playerCard.card?.reduce((a: number, b: number) => a + b, 0) ?? 50,
      };
    });

    return {
      managerStyle: 'balanced',
      managerName: 'Manager',
      teamName: myTeam ? `${myTeam.city} ${myTeam.name}` : 'My Team',
      playersOffered,
      playersRequested,
      teamNeeds: [],
    };
  }, [pendingTrade, roster, targetRosterEntries, myTeam]);

  if (leagueLoading || isRosterLoading) {
    return <LoadingLedger message="Loading transactions..." />;
  }

  const error = leagueError ?? rosterError ?? actionError;

  const otherTeams = teams
    .filter((t) => t.id !== myTeam?.id)
    .map((t) => ({ id: t.id, name: `${t.city} ${t.name}` }));

  const myRosterList = roster.map((r) => ({
    id: r.playerId,
    name: `${r.playerCard.nameFirst} ${r.playerCard.nameLast}`,
  }));

  return (
    <div className="space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Transactions</h2>

      {error && <ErrorBanner severity="error" message={error} />}

      <div className="flex gap-1 border-b border-sandstone">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-b-2 border-ballpark text-ballpark'
                : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'add-drop' && (
        <AddDropForm
          roster={roster}
          availablePlayers={availablePlayers}
          isLoadingPlayers={isLoadingPlayers}
          onDrop={handleDrop}
          onAdd={handleAdd}
          onSearchPlayers={handleSearchPlayers}
          canAdd={roster.length < 21}
        />
      )}

      {activeTab === 'trade' && (
        <>
          <TradeForm
            teams={otherTeams}
            myRoster={myRosterList}
            targetRoster={targetRoster}
            onTargetChange={handleTargetChange}
            onSelectionChange={handleSelectionChange}
            onSubmit={handleTrade}
          />
          <TradeEvaluationPanel request={tradeEvalRequest} />
        </>
      )}

      {activeTab === 'history' && (
        <TransactionLog transactions={transactions} />
      )}
    </div>
  );
}

export default TransactionsPage;
