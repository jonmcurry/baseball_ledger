/**
 * Tests for transaction-transform L1 helper
 * REQ-RST-005: Transform TransactionRow[] to TransactionEntry[]
 */

import { transformTransactionRows } from '@lib/transforms/transaction-transform';

describe('transformTransactionRows', () => {
  it('transforms an add transaction row', () => {
    const rows = [{
      id: 'tx-1',
      league_id: 'lg-1',
      team_id: 'tm-1',
      type: 'add' as const,
      details: {
        playersAdded: [{ playerId: 'ruthba01', playerName: 'Babe Ruth' }],
      },
      created_at: '2026-02-10T12:00:00Z',
    }];

    const result = transformTransactionRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('add');
    expect(result[0].playerName).toBe('Babe Ruth');
    expect(result[0].details).toBe('Added from free agents');
    expect(result[0].date).toBeTruthy();
  });

  it('transforms a drop transaction row', () => {
    const rows = [{
      id: 'tx-2',
      league_id: 'lg-1',
      team_id: 'tm-1',
      type: 'drop' as const,
      details: {
        playersDropped: ['gehrlo01'],
        playerNames: { gehrlo01: 'Lou Gehrig' },
      },
      created_at: '2026-02-10T13:00:00Z',
    }];

    const result = transformTransactionRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('drop');
    expect(result[0].playerName).toBe('Lou Gehrig');
    expect(result[0].details).toBe('Released to free agent pool');
  });

  it('transforms a trade transaction row', () => {
    const rows = [{
      id: 'tx-3',
      league_id: 'lg-1',
      team_id: 'tm-1',
      type: 'trade' as const,
      details: {
        targetTeamId: 'tm-2',
        playersFromMe: [{ playerId: 'ruthba01', playerName: 'Babe Ruth' }],
        playersFromThem: [{ playerId: 'willi01', playerName: 'Ted Williams' }],
      },
      created_at: '2026-02-10T14:00:00Z',
    }];

    const result = transformTransactionRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('trade');
    expect(result[0].playerName).toBe('Babe Ruth');
    expect(result[0].details).toContain('Ted Williams');
  });

  it('returns empty array for empty input', () => {
    expect(transformTransactionRows([])).toEqual([]);
  });

  it('handles missing details fields gracefully', () => {
    const rows = [{
      id: 'tx-4',
      league_id: 'lg-1',
      team_id: 'tm-1',
      type: 'add' as const,
      details: {},
      created_at: '2026-02-10T15:00:00Z',
    }];

    const result = transformTransactionRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('add');
    expect(result[0].playerName).toBe('Unknown');
    expect(result[0].details).toBe('Added from free agents');
  });
});
