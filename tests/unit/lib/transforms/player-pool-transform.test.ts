/**
 * Tests for transformPoolRows
 *
 * REQ-RST-005: Shared transform from PlayerPoolRow[] to AvailablePlayer[].
 */

import { transformPoolRows } from '@lib/transforms/player-pool-transform';
import type { PlayerPoolRow } from '@lib/types/database';

function makePoolRow(overrides: Partial<PlayerPoolRow> = {}): PlayerPoolRow {
  return {
    id: 'row-1',
    league_id: 'league-1',
    player_id: 'ruthba01',
    season_year: 1927,
    player_card: {
      playerId: 'ruthba01',
      nameFirst: 'Babe',
      nameLast: 'Ruth',
      seasonYear: 1927,
      primaryPosition: 'RF',
    },
    is_drafted: false,
    drafted_by_team_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('transformPoolRows', () => {
  it('transforms a single pool row to AvailablePlayer', () => {
    const rows = [makePoolRow()];
    const result = transformPoolRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      playerId: 'ruthba01',
      nameFirst: 'Babe',
      nameLast: 'Ruth',
      seasonYear: 1927,
      primaryPosition: 'RF',
    });
    expect(result[0].playerCard).toBeDefined();
  });

  it('returns empty array for empty input', () => {
    expect(transformPoolRows([])).toEqual([]);
  });

  it('falls back to defaults for missing card fields', () => {
    const rows = [makePoolRow({
      player_card: {},
      player_id: 'unknown01',
      season_year: 1900,
    })];
    const result = transformPoolRows(rows);
    expect(result[0]).toMatchObject({
      playerId: 'unknown01',
      nameFirst: '',
      nameLast: '',
      seasonYear: 1900,
      primaryPosition: 'DH',
    });
  });
});
