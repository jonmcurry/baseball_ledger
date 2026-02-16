/**
 * Cross-Validation: BBW Binary Cards vs Formula-Generated Cards
 *
 * Loads real 1971 BBW cards from PLAYERS.DAT and compares them against
 * formula-generated cards from the same 1971 Lahman CSV data.
 *
 * This is a DIAGNOSTIC test -- it measures the gap and logs correlation
 * metrics. It does not enforce pass/fail assertions on individual card
 * positions, only that the pipeline runs without error.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parsePlayers } from '@lib/bbw/players-parser';
import { parseNstat } from '@lib/bbw/nstat-parser';
import type { BbwPlayerRecord, BbwBattingStats } from '@lib/bbw/types';
import { runCsvPipeline } from '@lib/csv/load-pipeline';
import type { PlayerCard } from '@lib/types/player';

const BBW_1971_DIR = resolve(__dirname, '../../../../BBW/1971S.WDD');
const DATA_DIR = resolve(__dirname, '../../../../data_files');

let bbwPlayers: BbwPlayerRecord[];
let bbwStats: BbwBattingStats[];
let formulaCards: PlayerCard[];

/** Pearson correlation coefficient between two arrays. */
function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

/** Count occurrences of a specific value in a card. */
function countValue(card: number[], value: number): number {
  return card.filter((v) => v === value).length;
}

/** Normalize a BBW name for matching: trim, lowercase. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

beforeAll(() => {
  // Load BBW binary data
  const playersBuffer = readFileSync(resolve(BBW_1971_DIR, 'PLAYERS.DAT')).buffer;
  const nstatBuffer = readFileSync(resolve(BBW_1971_DIR, 'NSTAT.DAT')).buffer;
  bbwPlayers = parsePlayers(playersBuffer);
  bbwStats = parseNstat(nstatBuffer);

  // Load Lahman CSV data and generate formula cards
  const peopleCsv = readFileSync(resolve(DATA_DIR, 'People.csv'), 'utf8');
  const battingCsv = readFileSync(resolve(DATA_DIR, 'Batting.csv'), 'utf8');
  const pitchingCsv = readFileSync(resolve(DATA_DIR, 'Pitching.csv'), 'utf8');
  const fieldingCsv = readFileSync(resolve(DATA_DIR, 'Fielding.csv'), 'utf8');

  const result = runCsvPipeline({
    peopleCsv,
    battingCsv,
    pitchingCsv,
    fieldingCsv,
    yearRangeStart: 1971,
    yearRangeEnd: 1971,
  });

  formulaCards = result.cards;
});

interface MatchedPlayer {
  bbwLastName: string;
  bbwFirstName: string;
  formulaPlayerId: string;
  bbwCard: number[];
  formulaCard: number[];
  bbwPower: number;
  formulaPower: number;
}

/** Match BBW players to formula-generated cards by name. */
function matchPlayers(): MatchedPlayer[] {
  const matched: MatchedPlayer[] = [];

  for (let i = 0; i < bbwPlayers.length; i++) {
    const bbw = bbwPlayers[i];
    const bbwLast = normalizeName(bbw.lastName);
    const bbwFirst = normalizeName(bbw.firstName);

    // Find matching formula card by name
    const formula = formulaCards.find((fc) => {
      const fcLast = normalizeName(fc.nameLast);
      const fcFirst = normalizeName(fc.nameFirst);
      return fcLast === bbwLast && fcFirst === bbwFirst;
    });

    if (formula) {
      matched.push({
        bbwLastName: bbw.lastName,
        bbwFirstName: bbw.firstName,
        formulaPlayerId: formula.playerId,
        bbwCard: bbw.card,
        formulaCard: formula.card,
        bbwPower: bbw.card[24],
        formulaPower: formula.card[24],
      });
    }
  }

  return matched;
}

describe('Cross-Validation: BBW vs Formula Cards (1971)', () => {
  it('pipeline produces formula cards for 1971', () => {
    expect(formulaCards.length).toBeGreaterThan(0);
  });

  it('matches at least 200 players by name', () => {
    const matched = matchPlayers();
    // Log match count for diagnostics
    console.log(`Matched ${matched.length} of ${bbwPlayers.length} BBW players to Lahman cards`);
    expect(matched.length).toBeGreaterThanOrEqual(200);
  });

  it('reports card value frequency correlations', () => {
    const matched = matchPlayers();
    if (matched.length < 50) return; // Not enough data

    // For key card values, compute correlation between BBW and formula frequency counts
    const keyValues = [
      { value: 13, label: 'Walk (v13)' },
      { value: 14, label: 'Strikeout (v14)' },
      { value: 1, label: 'Home Run (v1)' },
      { value: 7, label: 'Single-7' },
      { value: 8, label: 'Single-8' },
      { value: 9, label: 'Single-9' },
      { value: 0, label: 'Double (v0)' },
    ];

    console.log('\n--- Card Value Frequency Correlations (BBW vs Formula) ---');
    console.log('Value      | Corr(r) | BBW Mean | Formula Mean');
    console.log('-----------|---------|----------|-------------');

    for (const kv of keyValues) {
      const bbwCounts = matched.map((m) => countValue(m.bbwCard, kv.value));
      const formulaCounts = matched.map((m) => countValue(m.formulaCard, kv.value));
      const r = pearsonR(bbwCounts, formulaCounts);
      const bbwMean = bbwCounts.reduce((a, b) => a + b, 0) / bbwCounts.length;
      const formulaMean = formulaCounts.reduce((a, b) => a + b, 0) / formulaCounts.length;

      console.log(
        `${kv.label.padEnd(10)} | ${r.toFixed(3).padStart(7)} | ${bbwMean.toFixed(2).padStart(8)} | ${formulaMean.toFixed(2).padStart(12)}`
      );
    }

    // Power rating correlation
    const bbwPower = matched.map((m) => m.bbwPower);
    const formulaPower = matched.map((m) => m.formulaPower);
    const powerR = pearsonR(bbwPower, formulaPower);
    console.log(`\nPower Rating (card[24]) correlation: r = ${powerR.toFixed(3)}`);

    const powerExactMatch = matched.filter((m) => m.bbwPower === m.formulaPower).length;
    console.log(`Power exact match: ${powerExactMatch}/${matched.length} (${(100 * powerExactMatch / matched.length).toFixed(1)}%)`);

    // Archetype byte 33-34 comparison
    const archetypeMatch = matched.filter(
      (m) => m.bbwCard[33] === m.formulaCard[33] && m.bbwCard[34] === m.formulaCard[34]
    ).length;
    console.log(`Archetype (bytes 33-34) exact match: ${archetypeMatch}/${matched.length} (${(100 * archetypeMatch / matched.length).toFixed(1)}%)`);

    // Overall card byte MAE (mean absolute error across all 35 positions)
    let totalMAE = 0;
    for (const m of matched) {
      let playerMAE = 0;
      for (let pos = 0; pos < 35; pos++) {
        playerMAE += Math.abs(m.bbwCard[pos] - m.formulaCard[pos]);
      }
      totalMAE += playerMAE / 35;
    }
    const overallMAE = totalMAE / matched.length;
    console.log(`\nOverall card byte MAE: ${overallMAE.toFixed(2)} (per position, per player)`);

    // This test always passes -- it's diagnostic
    expect(true).toBe(true);
  });
});
