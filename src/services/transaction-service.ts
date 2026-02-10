/**
 * Transaction Service
 *
 * REQ-RST-005: Roster transaction service layer.
 * Thin wrappers over the transactions API endpoint for
 * add, drop, trade, and history operations.
 *
 * Layer 3: Real service module.
 */

import type { TransactionEntry } from '@features/transactions/TransactionLog';
import { apiGet, apiPost } from './api-client';

/** Result from a transaction operation. */
export interface TransactionResult {
  transactionId: string;
  type: 'add' | 'drop' | 'trade';
  teamId: string;
  completedAt: string;
}

/**
 * Drop a player from a team's roster.
 */
export async function dropPlayer(
  leagueId: string,
  teamId: string,
  playerId: string,
): Promise<TransactionResult> {
  const response = await apiPost<TransactionResult>(
    `/api/leagues/${leagueId}/teams`,
    {
      type: 'drop',
      teamId,
      playersToDrop: [playerId],
    },
  );
  return response.data;
}

/**
 * Add a player to a team's roster.
 */
export async function addPlayer(
  leagueId: string,
  teamId: string,
  player: {
    playerId: string;
    playerName: string;
    seasonYear: number;
    playerCard: Record<string, unknown>;
  },
): Promise<TransactionResult> {
  const response = await apiPost<TransactionResult>(
    `/api/leagues/${leagueId}/teams`,
    {
      type: 'add',
      teamId,
      playersToAdd: [player],
    },
  );
  return response.data;
}

/**
 * Submit a trade between two teams.
 */
export async function submitTrade(
  leagueId: string,
  teamId: string,
  targetTeamId: string,
  playersFromMe: string[],
  playersFromThem: string[],
): Promise<TransactionResult> {
  const response = await apiPost<TransactionResult>(
    `/api/leagues/${leagueId}/teams`,
    {
      type: 'trade',
      teamId,
      targetTeamId,
      playersFromMe,
      playersFromThem,
    },
  );
  return response.data;
}

/**
 * Fetch transaction history for a league.
 */
export async function fetchTransactionHistory(
  leagueId: string,
): Promise<TransactionEntry[]> {
  const response = await apiGet<TransactionEntry[]>(
    `/api/leagues/${leagueId}/teams`,
  );
  return response.data;
}
