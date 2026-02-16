/**
 * Dual-Mode Card Source Tests
 *
 * Verifies that BBW binary cards can be converted into PlayerCard objects
 * and that they produce valid simulation results.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parsePlayers } from '@lib/bbw/players-parser';
import { parseNstat } from '@lib/bbw/nstat-parser';
import { parsePstat } from '@lib/bbw/pstat-parser';
import { generateCardFromBbw } from '@lib/card-generator/generator';
import type { BbwPlayerRecord, BbwBattingStats, BbwPitchingStats } from '@lib/bbw/types';
import type { PlayerCard } from '@lib/types/player';

const BBW_1971_DIR = resolve(__dirname, '../../../../BBW/1971S.WDD');

let players: BbwPlayerRecord[];
let battingStats: BbwBattingStats[];
let pitchingStats: BbwPitchingStats[];
let allPitcherERAs: number[];

beforeAll(() => {
  players = parsePlayers(readFileSync(resolve(BBW_1971_DIR, 'PLAYERS.DAT')).buffer);
  battingStats = parseNstat(readFileSync(resolve(BBW_1971_DIR, 'NSTAT.DAT')).buffer);
  pitchingStats = parsePstat(readFileSync(resolve(BBW_1971_DIR, 'PSTAT.DAT')).buffer);
  allPitcherERAs = pitchingStats
    .filter((p) => p.outs > 0)
    .map((p) => (p.ER * 27) / p.outs);
});

/** Find player index by last name. */
function findIdx(lastName: string): number {
  return players.findIndex((p) => p.lastName.toUpperCase() === lastName.toUpperCase());
}

describe('generateCardFromBbw', () => {
  it('converts Don Buford to a valid PlayerCard', () => {
    const idx = findIdx('BUFORD');
    expect(idx).toBeGreaterThanOrEqual(0);

    const card = generateCardFromBbw(players[idx], battingStats[idx], undefined, 1971, allPitcherERAs);

    expect(card.nameFirst).toBe('Don');
    expect(card.nameLast).toBe('Buford');
    expect(card.seasonYear).toBe(1971);
    expect(card.isPitcher).toBe(false);
    expect(card.card).toHaveLength(35);
    // Card bytes are the REAL BBW card
    expect(card.card[24]).toBe(16); // Buford's real power rating
    expect(card.card[32]).toBe(35); // Sentinel
    expect(card.card[33]).toBe(1);  // Archetype byte 33
    expect(card.card[34]).toBe(0);  // Archetype byte 34
    // Batting stats from NSTAT
    expect(card.mlbBattingStats?.G).toBe(122);
    expect(card.mlbBattingStats?.AB).toBe(449);
    expect(card.mlbBattingStats?.HR).toBe(19);
  });

  it('converts Frank Robinson with correct position and power', () => {
    const idx = findIdx('ROBINSON');
    // There may be multiple Robinsons; find Frank
    const frankIdx = players.findIndex(
      (p) => p.lastName === 'ROBINSON' && p.firstName === 'Frank'
    );
    expect(frankIdx).toBeGreaterThanOrEqual(0);

    const card = generateCardFromBbw(players[frankIdx], battingStats[frankIdx], undefined, 1971, allPitcherERAs);
    expect(card.nameFirst).toBe('Frank');
    expect(card.card[24]).toBe(20); // Robinson's power rating = 20 (very good)
    expect(card.mlbBattingStats?.HR).toBe(28);
  });

  it('converts Mark Belanger (0 HR, IDT-active power)', () => {
    const idx = players.findIndex(
      (p) => p.lastName === 'BELANGER' && p.firstName === 'Mark'
    );
    expect(idx).toBeGreaterThanOrEqual(0);

    const card = generateCardFromBbw(players[idx], battingStats[idx], undefined, 1971, allPitcherERAs);
    expect(card.card[24]).toBe(20); // Belanger's actual BBW power = 20 (IDT-active)
    expect(card.primaryPosition).toBe('SS');
    expect(card.battingHand).toBe('R');
  });

  it('converts Mike Cuellar as a pitcher with grade from position string', () => {
    const idx = players.findIndex(
      (p) => p.lastName === 'CUELLAR' && p.firstName === 'Mike'
    );
    expect(idx).toBeGreaterThanOrEqual(0);

    // Cuellar is a pitcher, need to find his PSTAT record
    // PSTAT has fewer records than PLAYERS, so we search by matching stats
    const pstat = pitchingStats.find(
      (p) => p.outs === 876 && p.W === 20 && p.L === 9
    );

    const card = generateCardFromBbw(players[idx], battingStats[idx], pstat, 1971, allPitcherERAs);
    expect(card.isPitcher).toBe(true);
    expect(card.primaryPosition).toBe('SP');
    expect(card.throwingHand).toBe('L');
    expect(card.pitching).toBeDefined();
    expect(card.pitching!.grade).toBe(14); // From position string "L 14     Z"
    expect(card.pitching!.era).toBeCloseTo(3.08, 0);
  });

  it('all BBW cards have 35-byte card arrays with valid sentinel', () => {
    // Convert first 50 players to verify batch conversion works
    for (let i = 0; i < 50 && i < players.length; i++) {
      const card = generateCardFromBbw(players[i], battingStats[i], undefined, 1971, allPitcherERAs);
      expect(card.card).toHaveLength(35);
      expect(card.card[32]).toBe(35);
      expect(card.playerId).toBe(`bbw_1971_${i}`);
    }
  });

  it('BBW card values are preserved exactly (no formula modification)', () => {
    const idx = findIdx('BUFORD');
    const card = generateCardFromBbw(players[idx], battingStats[idx], undefined, 1971, allPitcherERAs);

    // Every byte should match the raw BBW binary
    for (let pos = 0; pos < 35; pos++) {
      expect(card.card[pos]).toBe(players[idx].card[pos]);
    }
  });
});
