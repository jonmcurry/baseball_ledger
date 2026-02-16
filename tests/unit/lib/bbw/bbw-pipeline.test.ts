/**
 * BBW Pipeline Tests
 *
 * Verifies that runBbwPipeline converts an entire BBW season into
 * PlayerCard[] objects with correct pitcher-PSTAT matching.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parsePlayers } from '@lib/bbw/players-parser';
import { parseNstat } from '@lib/bbw/nstat-parser';
import { parsePstat } from '@lib/bbw/pstat-parser';
import {
  runBbwPipeline,
  getBbwSeasonYears,
  detectBbwYearsInRange,
  BBW_SEASON_MAP,
} from '@lib/bbw/bbw-pipeline';
import type { BbwPlayerRecord, BbwBattingStats, BbwPitchingStats } from '@lib/bbw/types';

const BBW_1971_DIR = resolve(__dirname, '../../../../BBW/1971S.WDD');

let players: BbwPlayerRecord[];
let battingStats: BbwBattingStats[];
let pitchingStats: BbwPitchingStats[];

beforeAll(() => {
  players = parsePlayers(readFileSync(resolve(BBW_1971_DIR, 'PLAYERS.DAT')).buffer);
  battingStats = parseNstat(readFileSync(resolve(BBW_1971_DIR, 'NSTAT.DAT')).buffer);
  pitchingStats = parsePstat(readFileSync(resolve(BBW_1971_DIR, 'PSTAT.DAT')).buffer);
});

describe('BBW_SEASON_MAP', () => {
  it('maps 3 real season years', () => {
    expect(Object.keys(BBW_SEASON_MAP)).toHaveLength(3);
    expect(BBW_SEASON_MAP[1921]).toBe('1921S.WDD');
    expect(BBW_SEASON_MAP[1943]).toBe('1943S.WDD');
    expect(BBW_SEASON_MAP[1971]).toBe('1971S.WDD');
  });
});

describe('getBbwSeasonYears', () => {
  it('returns [1921, 1943, 1971]', () => {
    const years = getBbwSeasonYears();
    expect(years).toEqual(expect.arrayContaining([1921, 1943, 1971]));
    expect(years).toHaveLength(3);
  });
});

describe('detectBbwYearsInRange', () => {
  it('returns all BBW years for full range', () => {
    const years = detectBbwYearsInRange(1901, 2025);
    expect(years).toEqual(expect.arrayContaining([1921, 1943, 1971]));
  });

  it('returns only 1971 for 1970-1972 range', () => {
    expect(detectBbwYearsInRange(1970, 1972)).toEqual([1971]);
  });

  it('returns empty for range with no BBW data', () => {
    expect(detectBbwYearsInRange(2000, 2025)).toEqual([]);
  });

  it('includes boundary years', () => {
    expect(detectBbwYearsInRange(1971, 1971)).toEqual([1971]);
    expect(detectBbwYearsInRange(1921, 1921)).toEqual([1921]);
  });
});

describe('runBbwPipeline', () => {
  let result: ReturnType<typeof runBbwPipeline>;

  beforeAll(() => {
    result = runBbwPipeline(players, battingStats, pitchingStats, 1971);
  });

  it('generates a card for every player (828 for 1971)', () => {
    expect(result.cards).toHaveLength(828);
  });

  it('all cards have seasonYear = 1971', () => {
    for (const card of result.cards) {
      expect(card.seasonYear).toBe(1971);
    }
  });

  it('all cards have bbw_ prefix playerIds', () => {
    for (const card of result.cards) {
      expect(card.playerId).toMatch(/^bbw_1971_\d+$/);
    }
  });

  it('all cards have 35-byte card arrays', () => {
    for (const card of result.cards) {
      expect(card.card).toHaveLength(35);
      expect(card.card[32]).toBe(35); // sentinel
    }
  });

  it('preserves Don Buford card bytes exactly', () => {
    const buford = result.cards.find(
      (c) => c.nameLast === 'Buford' && c.nameFirst === 'Don',
    );
    expect(buford).toBeDefined();
    expect(buford!.card[24]).toBe(16); // power rating
    expect(buford!.mlbBattingStats?.G).toBe(122);
    expect(buford!.mlbBattingStats?.AB).toBe(449);
    expect(buford!.mlbBattingStats?.HR).toBe(19);
  });

  it('correctly identifies and converts pitchers with PSTAT data', () => {
    const pitchers = result.cards.filter((c) => c.isPitcher);
    expect(pitchers.length).toBeGreaterThan(0);

    // Every pitcher should have pitching attributes
    // BBW uses grades 1-22 (wider than the 1-15 formula approximation)
    for (const p of pitchers) {
      expect(p.pitching).toBeDefined();
      expect(p.pitching!.grade).toBeGreaterThanOrEqual(1);
      expect(p.pitching!.grade).toBeLessThanOrEqual(22);
    }
  });

  it('matches Mike Cuellar to correct PSTAT record', () => {
    const cuellar = result.cards.find(
      (c) => c.nameLast === 'Cuellar' && c.nameFirst === 'Mike',
    );
    expect(cuellar).toBeDefined();
    expect(cuellar!.isPitcher).toBe(true);
    expect(cuellar!.pitching).toBeDefined();
    expect(cuellar!.pitching!.grade).toBe(14); // From position string "L 14"
    expect(cuellar!.mlbPitchingStats).toBeDefined();
    expect(cuellar!.mlbPitchingStats!.W).toBe(20);
    expect(cuellar!.mlbPitchingStats!.L).toBe(9);
    expect(cuellar!.mlbPitchingStats!.SO).toBe(124);
  });

  it('builds complete player name cache', () => {
    expect(Object.keys(result.playerNameCache)).toHaveLength(828);
    expect(result.playerNameCache['bbw_1971_0']).toBeDefined();
  });

  it('name cache entries are "First Last" format', () => {
    for (const name of Object.values(result.playerNameCache)) {
      expect(name).toMatch(/\S+ \S+/);
    }
  });

  it('position players are not assigned PSTAT data', () => {
    const buford = result.cards.find(
      (c) => c.nameLast === 'Buford' && c.nameFirst === 'Don',
    );
    expect(buford).toBeDefined();
    expect(buford!.isPitcher).toBe(false);
    expect(buford!.pitching).toBeUndefined();
    expect(buford!.mlbPitchingStats).toBeUndefined();
  });

  it('total pitchers matches PSTAT record count', () => {
    const pitcherCount = result.cards.filter((c) => c.isPitcher).length;
    // PSTAT has 343 records; pitcher count should be close
    // (some pitchers at end of PLAYERS may not have PSTAT if arrays don't match exactly)
    expect(pitcherCount).toBeGreaterThanOrEqual(pitchingStats.length - 5);
    expect(pitcherCount).toBeLessThanOrEqual(pitchingStats.length + 5);
  });
});
