/**
 * BBW Binary Parser Tests
 *
 * Tests PLAYERS.DAT, NSTAT.DAT, and PSTAT.DAT parsers against real
 * 1971 season BBW data with known player card values from
 * docs/APBA_REVERSE_ENGINEERING.md.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parsePlayers } from '@lib/bbw/players-parser';
import { parseNstat } from '@lib/bbw/nstat-parser';
import { parsePstat } from '@lib/bbw/pstat-parser';
import type { BbwPlayerRecord, BbwBattingStats, BbwPitchingStats } from '@lib/bbw/types';

// Path to 1971 season BBW data
const BBW_1971_DIR = resolve(__dirname, '../../../../BBW/1971S.WDD');

// Load binary files once for all tests
let players: BbwPlayerRecord[];
let battingStats: BbwBattingStats[];
let pitchingStats: BbwPitchingStats[];

beforeAll(() => {
  const playersBuffer = readFileSync(resolve(BBW_1971_DIR, 'PLAYERS.DAT')).buffer;
  const nstatBuffer = readFileSync(resolve(BBW_1971_DIR, 'NSTAT.DAT')).buffer;
  const pstatBuffer = readFileSync(resolve(BBW_1971_DIR, 'PSTAT.DAT')).buffer;

  players = parsePlayers(playersBuffer);
  battingStats = parseNstat(nstatBuffer);
  pitchingStats = parsePstat(pstatBuffer);
});

// Known card bytes from docs/APBA_REVERSE_ENGINEERING.md
const KNOWN_CARDS: Record<string, { firstName: string; card: number[] }> = {
  Buford: {
    firstName: 'Don',
    card: [14, 30, 11, 28, 30, 7, 27, 13, 8, 29, 9, 26, 6, 31, 14, 33, 28, 14, 29, 8, 14, 13, 9, 25, 16, 32, 8, 13, 40, 22, 31, 14, 35, 1, 0],
  },
  Robinson: {
    firstName: 'Frank',
    card: [14, 30, 8, 28, 13, 7, 27, 13, 8, 24, 9, 26, 5, 31, 42, 14, 24, 14, 29, 7, 14, 24, 9, 25, 20, 32, 8, 34, 24, 13, 30, 37, 35, 1, 0],
  },
  Belanger: {
    firstName: 'Mark',
    card: [14, 30, 8, 28, 30, 7, 27, 13, 8, 32, 9, 26, 7, 31, 39, 14, 24, 14, 29, 8, 14, 13, 9, 25, 20, 32, 8, 34, 23, 26, 31, 22, 35, 0, 2],
  },
  Cuellar: {
    firstName: 'Mike',
    card: [13, 30, 23, 13, 13, 9, 27, 13, 36, 13, 13, 26, 8, 31, 13, 13, 24, 13, 29, 9, 14, 13, 13, 25, 13, 32, 21, 34, 13, 13, 13, 13, 35, 0, 1],
  },
};

/** Find a player by last name (case-insensitive) and optionally first name. */
function findPlayer(lastName: string, firstName?: string): BbwPlayerRecord | undefined {
  const lastUpper = lastName.toUpperCase();
  return players.find(
    (p) =>
      p.lastName.toUpperCase() === lastUpper &&
      (firstName === undefined || p.firstName === firstName),
  );
}

describe('parsePlayers (PLAYERS.DAT)', () => {
  it('parses correct number of records (828 for 1971)', () => {
    expect(players).toHaveLength(828);
  });

  it('throws on invalid buffer size', () => {
    const badBuffer = new ArrayBuffer(100);
    expect(() => parsePlayers(badBuffer)).toThrow('not a multiple of 146');
  });

  it('extracts player names correctly', () => {
    const buford = findPlayer('Buford', 'Don');
    expect(buford).toBeDefined();
    expect(buford!.firstName).toBe('Don');
    // BBW stores last names in ALL CAPS
    expect(buford!.lastName).toBe('BUFORD');
  });

  describe('known card verification', () => {
    for (const [lastName, expected] of Object.entries(KNOWN_CARDS)) {
      it(`${expected.firstName} ${lastName} card matches known bytes`, () => {
        const player = findPlayer(lastName, expected.firstName);
        expect(player).toBeDefined();
        expect(player!.card).toEqual(expected.card);
      });
    }
  });

  it('Belanger card[24] = 20 (IDT-active power rating, not 13)', () => {
    const belanger = findPlayer('Belanger', 'Mark');
    expect(belanger).toBeDefined();
    expect(belanger!.card[24]).toBe(20);
  });

  it('Cuellar card has 16 values of 13 (pitcher flood)', () => {
    const cuellar = findPlayer('Cuellar', 'Mike');
    expect(cuellar).toBeDefined();
    const walkCount = cuellar!.card.filter((v) => v === 13).length;
    expect(walkCount).toBe(16);
  });

  it('all cards are exactly 35 bytes', () => {
    for (const player of players) {
      expect(player.card).toHaveLength(35);
    }
  });

  it('position 32 is always 35 (sentinel/delimiter)', () => {
    for (const player of players) {
      expect(player.card[32]).toBe(35);
    }
  });

  it('extracts position string for pitchers', () => {
    const cuellar = findPlayer('Cuellar', 'Mike');
    expect(cuellar).toBeDefined();
    // Cuellar: Left-handed, grade 14 starter
    expect(cuellar!.positionString).toContain('L');
    expect(cuellar!.positionString).toContain('14');
  });

  it('extracts position string for position players', () => {
    const belanger = findPlayer('Belanger', 'Mark');
    expect(belanger).toBeDefined();
    expect(belanger!.positionString).toContain('SS');
  });
});

describe('parseNstat (NSTAT.DAT)', () => {
  it('parses correct number of records (828 for 1971)', () => {
    expect(battingStats).toHaveLength(828);
  });

  it('throws on invalid buffer size', () => {
    const badBuffer = new ArrayBuffer(100);
    expect(() => parseNstat(badBuffer)).toThrow('not a multiple of 32');
  });

  it('Buford batting stats match known values', () => {
    // Buford should be at same index as in PLAYERS.DAT
    const bufordPlayer = findPlayer('Buford', 'Don');
    expect(bufordPlayer).toBeDefined();
    const stats = battingStats[bufordPlayer!.index];

    expect(stats.G).toBe(122);
    expect(stats.AB).toBe(449);
    expect(stats.R).toBe(99);
    expect(stats.H).toBe(130);
    expect(stats.HR).toBe(19);
    expect(stats.BB).toBe(62);
    expect(stats.SO).toBe(89);
  });

  it('all records have non-negative values', () => {
    for (const stats of battingStats) {
      expect(stats.G).toBeGreaterThanOrEqual(0);
      expect(stats.AB).toBeGreaterThanOrEqual(0);
      expect(stats.H).toBeGreaterThanOrEqual(0);
      expect(stats.HR).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('parsePstat (PSTAT.DAT)', () => {
  it('parses correct number of records (343 for 1971)', () => {
    expect(pitchingStats).toHaveLength(343);
  });

  it('throws on invalid buffer size', () => {
    const badBuffer = new ArrayBuffer(100);
    expect(() => parsePstat(badBuffer)).toThrow('not a multiple of 22');
  });

  it('Cuellar pitching stats match known values', () => {
    // Find Cuellar in pitching stats (need to identify the right record)
    // Cuellar: outs=876 (IP=292), W=20, L=9, SO=124
    const cuellar = pitchingStats.find(
      (p) => p.outs === 876 && p.W === 20 && p.L === 9,
    );
    expect(cuellar).toBeDefined();
    expect(cuellar!.IP).toBeCloseTo(292, 0);
    expect(cuellar!.SO).toBe(124);
  });

  it('all records have non-negative values', () => {
    for (const stats of pitchingStats) {
      expect(stats.outs).toBeGreaterThanOrEqual(0);
      expect(stats.W).toBeGreaterThanOrEqual(0);
      expect(stats.SO).toBeGreaterThanOrEqual(0);
    }
  });

  it('IP is correctly computed from outs (outs / 3)', () => {
    for (const stats of pitchingStats) {
      expect(stats.IP).toBeCloseTo(stats.outs / 3, 5);
    }
  });
});
