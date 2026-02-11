/**
 * Transaction Transform
 *
 * REQ-RST-005: Transform TransactionRow[] to TransactionEntry[] for UI display.
 * Pure function, no I/O.
 *
 * Layer 1: Pure logic.
 */

import type { TransactionRow } from '../types/database';

/** UI-ready transaction entry (matches TransactionLog component). */
export interface TransactionEntry {
  readonly type: 'add' | 'drop' | 'trade';
  readonly playerName: string;
  readonly date: string;
  readonly details: string;
}

interface PlayerRef {
  playerId: string;
  playerName: string;
}

/**
 * Transform database transaction rows into UI-ready TransactionEntry objects.
 */
export function transformTransactionRows(rows: TransactionRow[]): TransactionEntry[] {
  return rows.map((row) => {
    const d = row.details as Record<string, unknown>;

    switch (row.type) {
      case 'add':
        return {
          type: 'add',
          playerName: extractAddedNames(d),
          date: formatDate(row.created_at),
          details: 'Added from free agents',
        };

      case 'drop':
        return {
          type: 'drop',
          playerName: extractDroppedNames(d),
          date: formatDate(row.created_at),
          details: 'Released to free agent pool',
        };

      case 'trade':
        return {
          type: 'trade',
          playerName: extractTradeFromMe(d),
          date: formatDate(row.created_at),
          details: `Traded for ${extractTradeFromThem(d)}`,
        };

      default:
        return {
          type: row.type,
          playerName: 'Unknown',
          date: formatDate(row.created_at),
          details: '',
        };
    }
  });
}

function extractAddedNames(d: Record<string, unknown>): string {
  const added = d.playersAdded as PlayerRef[] | undefined;
  if (!added || added.length === 0) return 'Unknown';
  return added.map((p) => p.playerName).join(', ');
}

function extractDroppedNames(d: Record<string, unknown>): string {
  const names = d.playerNames as Record<string, string> | undefined;
  const dropped = d.playersDropped as string[] | undefined;
  if (!dropped || dropped.length === 0) return 'Unknown';
  if (names) {
    return dropped.map((id) => names[id] ?? id).join(', ');
  }
  return dropped.join(', ');
}

function extractTradeFromMe(d: Record<string, unknown>): string {
  const fromMe = d.playersFromMe as PlayerRef[] | undefined;
  if (!fromMe || fromMe.length === 0) return 'Unknown';
  return fromMe.map((p) => p.playerName).join(', ');
}

function extractTradeFromThem(d: Record<string, unknown>): string {
  const fromThem = d.playersFromThem as PlayerRef[] | undefined;
  if (!fromThem || fromThem.length === 0) return 'Unknown';
  return fromThem.map((p) => p.playerName).join(', ');
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString();
  } catch {
    return isoString;
  }
}
