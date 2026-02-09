import {
  snakeToCamelStr,
  camelToSnakeStr,
  snakeToCamel,
  camelToSnake,
} from '../../../../api/_lib/transform';

describe('api/_lib/transform', () => {
  describe('snakeToCamelStr', () => {
    it('converts simple snake_case', () => {
      expect(snakeToCamelStr('home_team_id')).toBe('homeTeamId');
    });

    it('converts single word (no change)', () => {
      expect(snakeToCamelStr('name')).toBe('name');
    });

    it('converts multiple underscores', () => {
      expect(snakeToCamelStr('is_complete')).toBe('isComplete');
    });

    it('handles empty string', () => {
      expect(snakeToCamelStr('')).toBe('');
    });
  });

  describe('camelToSnakeStr', () => {
    it('converts simple camelCase', () => {
      expect(camelToSnakeStr('homeTeamId')).toBe('home_team_id');
    });

    it('converts single word (no change)', () => {
      expect(camelToSnakeStr('name')).toBe('name');
    });

    it('handles empty string', () => {
      expect(camelToSnakeStr('')).toBe('');
    });
  });

  describe('snakeToCamel (deep object)', () => {
    it('converts flat object keys', () => {
      const input = { home_team_id: '1', away_score: 5 };
      const result = snakeToCamel(input);
      expect(result).toEqual({ homeTeamId: '1', awayScore: 5 });
    });

    it('converts nested object keys', () => {
      const input = { team_info: { team_name: 'Sluggers', win_count: 52 } };
      const result = snakeToCamel(input);
      expect(result).toEqual({ teamInfo: { teamName: 'Sluggers', winCount: 52 } });
    });

    it('converts arrays of objects', () => {
      const input = [{ player_id: '1' }, { player_id: '2' }];
      const result = snakeToCamel(input);
      expect(result).toEqual([{ playerId: '1' }, { playerId: '2' }]);
    });

    it('preserves null', () => {
      expect(snakeToCamel(null)).toBeNull();
    });

    it('preserves undefined', () => {
      expect(snakeToCamel(undefined)).toBeUndefined();
    });

    it('preserves primitive values', () => {
      expect(snakeToCamel(42)).toBe(42);
      expect(snakeToCamel('hello')).toBe('hello');
      expect(snakeToCamel(true)).toBe(true);
    });

    it('handles mixed nesting with arrays', () => {
      const input = {
        league_id: 'L1',
        teams: [
          { team_name: 'A', roster_entries: [{ player_id: 'P1' }] },
        ],
      };
      const result = snakeToCamel(input);
      expect(result).toEqual({
        leagueId: 'L1',
        teams: [
          { teamName: 'A', rosterEntries: [{ playerId: 'P1' }] },
        ],
      });
    });
  });

  describe('camelToSnake (deep object)', () => {
    it('converts flat object keys', () => {
      const input = { homeTeamId: '1', awayScore: 5 };
      const result = camelToSnake(input);
      expect(result).toEqual({ home_team_id: '1', away_score: 5 });
    });

    it('converts nested object keys', () => {
      const input = { teamInfo: { teamName: 'Sluggers' } };
      const result = camelToSnake(input);
      expect(result).toEqual({ team_info: { team_name: 'Sluggers' } });
    });

    it('preserves null and undefined', () => {
      expect(camelToSnake(null)).toBeNull();
      expect(camelToSnake(undefined)).toBeUndefined();
    });
  });
});
