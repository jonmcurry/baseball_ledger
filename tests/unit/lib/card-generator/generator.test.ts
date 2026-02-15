import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generateCard, generateAllCards } from '@lib/card-generator/generator';
import { loadPeople } from '@lib/csv/people-loader';
import { loadBatting } from '@lib/csv/batting-loader';
import { loadPitching } from '@lib/csv/pitching-loader';
import { loadFielding } from '@lib/csv/fielding-loader';
import { buildPlayerPool, computeLeagueAverages } from '@lib/csv/player-pool';
import { CARD_LENGTH } from '@lib/card-generator/structural';
import type { PlayerPoolEntry, LeagueAverages } from '@lib/csv/csv-types';
import type { BattingStats, PitchingStats } from '@lib/types';

// Load mini-lahman fixtures
const fixtureDir = resolve(__dirname, '../../../fixtures/mini-lahman');
const peopleCsv = readFileSync(resolve(fixtureDir, 'People.csv'), 'utf-8');
const battingCsv = readFileSync(resolve(fixtureDir, 'Batting.csv'), 'utf-8');
const pitchingCsv = readFileSync(resolve(fixtureDir, 'Pitching.csv'), 'utf-8');
const fieldingCsv = readFileSync(resolve(fixtureDir, 'Fielding.csv'), 'utf-8');

const people = loadPeople(peopleCsv).data;
const batting = loadBatting(battingCsv).data;
const pitching = loadPitching(pitchingCsv).data;
const fielding = loadFielding(fieldingCsv).data;
const yearRange = { start: 1971, end: 1971 };

const pool = buildPlayerPool(people, batting, pitching, fielding, yearRange).data;
const leagueAverages = computeLeagueAverages(pool);
const allPitcherERAs = pool
  .filter((e) => e.qualifiesAsPitcher && e.pitchingStats)
  .map((e) => e.pitchingStats!.ERA);

function makeBattingStats(overrides: Partial<BattingStats> = {}): BattingStats {
  return {
    G: 0, AB: 0, R: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0,
    SB: 0, CS: 0, BB: 0, SO: 0, IBB: 0, HBP: 0, SH: 0, SF: 0, GIDP: 0,
    BA: 0, OBP: 0, SLG: 0, OPS: 0,
    ...overrides,
  };
}

function makePitchingStats(overrides: Partial<PitchingStats> = {}): PitchingStats {
  return {
    G: 0, GS: 0, W: 0, L: 0, SV: 0, IP: 0, H: 0, R: 0, ER: 0, HR: 0,
    BB: 0, SO: 0, HBP: 0, BF: 0, WP: 0, BK: 0, CG: 0, SHO: 0, HLD: 0, BS: 0,
    ERA: 0, WHIP: 0, FIP: 0,
    ...overrides,
  };
}

describe('generateCard (REQ-DATA-005)', () => {
  it('generates a 35-element card for a batter', () => {
    const alomar = pool.find((e) => e.playerID === 'alomasa01')!;
    const card = generateCard(alomar, leagueAverages, allPitcherERAs);

    expect(card.card).toHaveLength(CARD_LENGTH);
    expect(card.isPitcher).toBe(false);
  });

  it('generates a 35-element card for a pitcher', () => {
    const blue = pool.find((e) => e.playerID === 'bluevi01')!;
    const card = generateCard(blue, leagueAverages, allPitcherERAs);

    expect(card.card).toHaveLength(CARD_LENGTH);
  });

  it('preserves structural constants in every card', () => {
    for (const entry of pool.slice(0, 10)) {
      const card = generateCard(entry, leagueAverages, allPitcherERAs);
      expect(card.card[1]).toBe(30);
      expect(card.card[3]).toBe(28);
      expect(card.card[6]).toBe(27);
      expect(card.card[11]).toBe(26);
      expect(card.card[13]).toBe(31);
      expect(card.card[18]).toBe(29);
      expect(card.card[23]).toBe(25);
      expect(card.card[25]).toBe(32);
      expect(card.card[32]).toBe(35);
    }
  });

  it('all card values are in range 0-42', () => {
    for (const entry of pool) {
      const card = generateCard(entry, leagueAverages, allPitcherERAs);
      for (let i = 0; i < CARD_LENGTH; i++) {
        expect(card.card[i]).toBeGreaterThanOrEqual(0);
        expect(card.card[i]).toBeLessThanOrEqual(42);
      }
    }
  });

  it('assigns correct identity fields', () => {
    const blue = pool.find((e) => e.playerID === 'bluevi01')!;
    const card = generateCard(blue, leagueAverages, allPitcherERAs);

    expect(card.playerId).toBe('bluevi01');
    expect(card.nameFirst).toBe('Vida');
    expect(card.nameLast).toBe('Blue');
    expect(card.seasonYear).toBe(1971);
    expect(card.throwingHand).toBe('L');
  });

  it('assigns power rating based on ISO', () => {
    const alomar = pool.find((e) => e.playerID === 'alomasa01')!;
    const card = generateCard(alomar, leagueAverages, allPitcherERAs);

    // Power rating should be one of the valid tier values
    expect([13, 15, 16, 17, 18, 19, 20, 21]).toContain(card.powerRating);
  });

  it('assigns archetype bytes 33-34', () => {
    const card = generateCard(pool[0], leagueAverages, allPitcherERAs);

    expect(card.archetype.byte33).toBeGreaterThanOrEqual(0);
    expect(card.archetype.byte33).toBeLessThanOrEqual(8);
    expect(card.archetype.byte34).toBeGreaterThanOrEqual(0);
    expect(card.archetype.byte34).toBeLessThanOrEqual(6);
  });

  it('stores archetype in card positions 33-34', () => {
    const card = generateCard(pool[0], leagueAverages, allPitcherERAs);

    expect(card.card[33]).toBe(card.archetype.byte33);
    expect(card.card[34]).toBe(card.archetype.byte34);
  });

  it('assigns pitching attributes for qualifying pitchers', () => {
    const blue = pool.find((e) => e.playerID === 'bluevi01')!;
    const card = generateCard(blue, leagueAverages, allPitcherERAs);

    expect(card.pitching).toBeDefined();
    expect(card.pitching!.grade).toBeGreaterThanOrEqual(1);
    expect(card.pitching!.grade).toBeLessThanOrEqual(15);
    expect(card.pitching!.era).toBe(blue.pitchingStats!.ERA);
    expect(card.pitching!.role).toBe('SP');
  });

  it('does not assign pitching attributes for non-pitchers', () => {
    const alomar = pool.find((e) => e.playerID === 'alomasa01')!;
    const card = generateCard(alomar, leagueAverages, allPitcherERAs);

    expect(card.pitching).toBeUndefined();
  });

  it('computes speed rating in [0, 1]', () => {
    for (const entry of pool.slice(0, 10)) {
      const card = generateCard(entry, leagueAverages, allPitcherERAs);
      expect(card.speed).toBeGreaterThanOrEqual(0);
      expect(card.speed).toBeLessThanOrEqual(1);
    }
  });

  it('computes discipline rating in [0, 1]', () => {
    for (const entry of pool.slice(0, 10)) {
      const card = generateCard(entry, leagueAverages, allPitcherERAs);
      expect(card.discipline).toBeGreaterThanOrEqual(0);
      expect(card.discipline).toBeLessThanOrEqual(1);
    }
  });

  it('computes contact rate in [0, 1]', () => {
    for (const entry of pool.slice(0, 10)) {
      const card = generateCard(entry, leagueAverages, allPitcherERAs);
      expect(card.contactRate).toBeGreaterThanOrEqual(0);
      expect(card.contactRate).toBeLessThanOrEqual(1);
    }
  });

  it('computes fielding metrics in [0, 1]', () => {
    for (const entry of pool.slice(0, 10)) {
      const card = generateCard(entry, leagueAverages, allPitcherERAs);
      expect(card.fieldingPct).toBeGreaterThanOrEqual(0);
      expect(card.fieldingPct).toBeLessThanOrEqual(1);
      expect(card.range).toBeGreaterThanOrEqual(0);
      expect(card.range).toBeLessThanOrEqual(1);
      expect(card.arm).toBeGreaterThanOrEqual(0);
      expect(card.arm).toBeLessThanOrEqual(1);
    }
  });

  it('assigns eligible positions including primary', () => {
    const alomar = pool.find((e) => e.playerID === 'alomasa01')!;
    const card = generateCard(alomar, leagueAverages, allPitcherERAs);

    expect(card.eligiblePositions).toContain(card.primaryPosition);
    expect(card.eligiblePositions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('generateCard with synthetic entries', () => {
  const avgLeague: LeagueAverages = {
    BA: 0.250, hrPerPA: 0.03, bbPerPA: 0.08, soPerPA: 0.17,
    ERA: 3.50, k9: 6.0, bb9: 3.0, ISO: 0.130, BABIP: 0.300,
  };

  it('handles a pure pitcher entry (qualifies only as pitcher)', () => {
    const entry: PlayerPoolEntry = {
      playerID: 'test01', nameFirst: 'Test', nameLast: 'Pitcher',
      seasonYear: 1971, battingHand: 'R', throwingHand: 'R',
      battingStats: null, pitchingStats: makePitchingStats({
        G: 35, GS: 35, W: 20, L: 9, IP: 250, ER: 70,
        H: 200, BB: 60, SO: 200, HR: 15, SV: 0,
        ERA: 2.52, WHIP: 1.040, BF: 1000,
      }),
      fieldingRecords: [],
      qualifiesAsBatter: false, qualifiesAsPitcher: true, isTwoWay: false,
    };

    const card = generateCard(entry, avgLeague, [2.52, 3.00, 4.00]);

    expect(card.isPitcher).toBe(true);
    expect(card.primaryPosition).toBe('SP');
    expect(card.powerRating).toBe(13); // No power
    expect(card.archetype).toEqual({ byte33: 0, byte34: 6 }); // Pitcher
    expect(card.pitching).toBeDefined();
    expect(card.pitching!.role).toBe('SP');
    expect(card.pitching!.grade).toBeGreaterThanOrEqual(13);
  });

  it('handles a two-way player', () => {
    const entry: PlayerPoolEntry = {
      playerID: 'test02', nameFirst: 'Two', nameLast: 'Way',
      seasonYear: 1971, battingHand: 'R', throwingHand: 'R',
      battingStats: makeBattingStats({
        G: 100, AB: 400, H: 120, doubles: 20, triples: 3, HR: 15,
        BB: 40, SO: 80, SB: 5, CS: 3, HBP: 2, SF: 3, SH: 0,
        BA: 0.300, OBP: 0.360, SLG: 0.500, OPS: 0.860, GIDP: 10,
      }),
      pitchingStats: makePitchingStats({
        G: 20, GS: 20, W: 8, L: 5, IP: 120, ER: 40,
        H: 100, BB: 30, SO: 90, HR: 10, SV: 0,
        ERA: 3.00, WHIP: 1.083, BF: 500,
      }),
      fieldingRecords: [],
      qualifiesAsBatter: true, qualifiesAsPitcher: true, isTwoWay: true,
    };

    const card = generateCard(entry, avgLeague, [3.00, 4.00, 5.00]);

    // Two-way: gets a batter card (since qualifiesAsBatter is true)
    expect(card.isPitcher).toBe(false);
    // But also gets pitching attributes
    expect(card.pitching).toBeDefined();
    expect(card.pitching!.role).toBe('SP');
  });

  it('handles a closer', () => {
    const entry: PlayerPoolEntry = {
      playerID: 'test03', nameFirst: 'Test', nameLast: 'Closer',
      seasonYear: 1971, battingHand: 'R', throwingHand: 'R',
      battingStats: null, pitchingStats: makePitchingStats({
        G: 60, GS: 0, SV: 30, IP: 80, ER: 18,
        H: 50, BB: 25, SO: 100, HR: 5,
        ERA: 2.025, WHIP: 0.938, BF: 300,
      }),
      fieldingRecords: [],
      qualifiesAsBatter: false, qualifiesAsPitcher: true, isTwoWay: false,
    };

    const card = generateCard(entry, avgLeague, [2.025, 3.00, 4.00]);

    expect(card.primaryPosition).toBe('CL');
    expect(card.pitching!.role).toBe('CL');
    expect(card.pitching!.isReliever).toBe(true);
  });

  it('assigns DH when no fielding records', () => {
    const entry: PlayerPoolEntry = {
      playerID: 'test04', nameFirst: 'Test', nameLast: 'DH',
      seasonYear: 1971, battingHand: 'R', throwingHand: 'R',
      battingStats: makeBattingStats({ G: 100, AB: 400, H: 100, BB: 30, BA: 0.250, OBP: 0.310, SLG: 0.400, OPS: 0.710 }),
      pitchingStats: null,
      fieldingRecords: [],
      qualifiesAsBatter: true, qualifiesAsPitcher: false, isTwoWay: false,
    };

    const card = generateCard(entry, avgLeague, []);
    expect(card.primaryPosition).toBe('DH');
  });
});

describe('generateAllCards', () => {
  it('generates a card for every player in the pool', () => {
    const cards = generateAllCards(pool, leagueAverages);
    expect(cards).toHaveLength(pool.length);
  });

  it('every card has 35 elements', () => {
    const cards = generateAllCards(pool, leagueAverages);
    for (const card of cards) {
      expect(card.card).toHaveLength(CARD_LENGTH);
    }
  });

  it('all cards have valid structural constants', () => {
    const cards = generateAllCards(pool, leagueAverages);
    for (const card of cards) {
      expect(card.card[1]).toBe(30);
      expect(card.card[3]).toBe(28);
      expect(card.card[6]).toBe(27);
      expect(card.card[11]).toBe(26);
      expect(card.card[13]).toBe(31);
      expect(card.card[18]).toBe(29);
      expect(card.card[23]).toBe(25);
      expect(card.card[25]).toBe(32);
      expect(card.card[32]).toBe(35);
    }
  });

  it('pitcher grades are distributed across the pool', () => {
    const cards = generateAllCards(pool, leagueAverages);
    const pitcherCards = cards.filter((c) => c.pitching);

    if (pitcherCards.length > 1) {
      const grades = pitcherCards.map((c) => c.pitching!.grade);
      const uniqueGrades = new Set(grades);
      // With multiple pitchers, we should have some grade variety
      expect(uniqueGrades.size).toBeGreaterThan(1);
    }
  });

  it('power ratings vary across batters', () => {
    const cards = generateAllCards(pool, leagueAverages);
    const batterCards = cards.filter((c) => !c.isPitcher);
    const powerRatings = new Set(batterCards.map((c) => c.powerRating));
    // Should have at least 2 different power ratings across batters
    expect(powerRatings.size).toBeGreaterThan(1);
  });
});
