/**
 * Tests for PlayerPool database types
 *
 * Validates type shapes match the 00016 migration schema.
 */

import type {
  PlayerPoolRow,
  PlayerPoolInsert,
  LeagueRow,
} from '@lib/types/database';

describe('PlayerPool database types', () => {
  it('PlayerPoolRow has all required fields', () => {
    const row: PlayerPoolRow = {
      id: 'pp-1',
      league_id: 'league-1',
      player_id: 'ruthba01',
      season_year: 1927,
      player_card: { playerId: 'ruthba01', card: [] },
      is_drafted: false,
      drafted_by_team_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };

    expect(row.id).toBe('pp-1');
    expect(row.league_id).toBe('league-1');
    expect(row.player_id).toBe('ruthba01');
    expect(row.season_year).toBe(1927);
    expect(row.is_drafted).toBe(false);
    expect(row.drafted_by_team_id).toBeNull();
  });

  it('PlayerPoolInsert omits auto-generated fields', () => {
    const insert: PlayerPoolInsert = {
      league_id: 'league-1',
      player_id: 'ruthba01',
      season_year: 1927,
      player_card: { playerId: 'ruthba01' },
    };

    expect(insert.league_id).toBe('league-1');
    // id, created_at should not be required
    expect((insert as Record<string, unknown>).id).toBeUndefined();
  });

  it('LeagueRow includes player_name_cache field', () => {
    const row: Partial<LeagueRow> = {
      id: 'league-1',
      player_name_cache: { ruthba01: 'Babe Ruth' },
    };

    expect(row.player_name_cache).toEqual({ ruthba01: 'Babe Ruth' });
  });
});
