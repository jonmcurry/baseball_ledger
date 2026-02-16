/**
 * Multi-Season Calibration Test Harness
 *
 * Loads all 3 BBW seasons (1921, 1943, 1971) + matching Lahman CSV data,
 * matches players by name, and fits linear regressions:
 *   bbw_card_count = slope * lahman_stat_rate + intercept
 *
 * Outputs calibrated coefficients for the formula card generator.
 * These coefficients replace the ad-hoc constants in value-mapper.ts.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parsePlayers } from '@lib/bbw/players-parser';
import { parseNstat } from '@lib/bbw/nstat-parser';
import type { BbwPlayerRecord, BbwBattingStats } from '@lib/bbw/types';
import { runCsvPipeline } from '@lib/csv/load-pipeline';
import type { PlayerCard } from '@lib/types/player';

const BBW_DIR = resolve(__dirname, '../../../../BBW');
const DATA_DIR = resolve(__dirname, '../../../../data_files');

const BBW_SEASONS = [1921, 1943, 1971] as const;

/** Pearson correlation coefficient. */
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

/** Fit OLS linear regression: y = slope * x + intercept. Returns { slope, intercept, r2 }. */
function fitLinearRegression(
  x: number[],
  y: number[],
): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  if (n < 3) return { slope: 0, intercept: 0, r2: 0 };

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  }

  if (ssXX === 0) return { slope: 0, intercept: meanY, r2: 0 };

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const r = ssYY === 0 ? 0 : ssXY / Math.sqrt(ssXX * ssYY);
  const r2 = r * r;

  return { slope, intercept, r2 };
}

/** Count occurrences of specific value(s) in a card array. */
function countValues(card: number[], values: number[]): number {
  return card.filter((v) => values.includes(v)).length;
}

/** Normalize name for matching. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

interface MatchedPair {
  year: number;
  bbwLastName: string;
  bbwFirstName: string;
  bbwCard: number[];
  bbwBatting: BbwBattingStats;
  bbwIsPitcher: boolean;
  formulaCard: PlayerCard;
  lahmanRates: {
    walkRate: number;
    soRate: number;
    hrRate: number;
    singleRate: number;
    doubleRate: number;
    tripleRate: number;
    sbRate: number;
    iso: number;
    PA: number;
  };
}

/** Load BBW binary data for a season year. */
function loadBbwSeason(year: number): { players: BbwPlayerRecord[]; batting: BbwBattingStats[] } {
  const dir = resolve(BBW_DIR, `${year}S.WDD`);
  const playersBuffer = readFileSync(resolve(dir, 'PLAYERS.DAT')).buffer;
  const nstatBuffer = readFileSync(resolve(dir, 'NSTAT.DAT')).buffer;
  return {
    players: parsePlayers(playersBuffer),
    batting: parseNstat(nstatBuffer),
  };
}

/** Load Lahman CSV data and generate formula cards for a year. */
function loadLahmanSeason(year: number): PlayerCard[] {
  const peopleCsv = readFileSync(resolve(DATA_DIR, 'People.csv'), 'utf8');
  const battingCsv = readFileSync(resolve(DATA_DIR, 'Batting.csv'), 'utf8');
  const pitchingCsv = readFileSync(resolve(DATA_DIR, 'Pitching.csv'), 'utf8');
  const fieldingCsv = readFileSync(resolve(DATA_DIR, 'Fielding.csv'), 'utf8');

  const result = runCsvPipeline({
    peopleCsv,
    battingCsv,
    pitchingCsv,
    fieldingCsv,
    yearRangeStart: year,
    yearRangeEnd: year,
  });

  return result.cards;
}

/** Match BBW players to Lahman formula cards by name. */
function matchPlayers(
  bbwPlayers: BbwPlayerRecord[],
  bbwBatting: BbwBattingStats[],
  formulaCards: PlayerCard[],
  year: number,
): MatchedPair[] {
  const matched: MatchedPair[] = [];

  for (let i = 0; i < bbwPlayers.length; i++) {
    const bbw = bbwPlayers[i];
    const batting = bbwBatting[i];
    if (!batting) continue;

    const bbwLast = normalizeName(bbw.lastName);
    const bbwFirst = normalizeName(bbw.firstName);

    const formula = formulaCards.find((fc) => {
      return normalizeName(fc.nameLast) === bbwLast && normalizeName(fc.nameFirst) === bbwFirst;
    });

    if (!formula || !formula.mlbBattingStats) continue;

    // Detect BBW pitcher by position string (starts with L/R + space + digit)
    const bbwIsPitcher = /^[LR]\s+\d+/.test(bbw.positionString.trim());

    // Compute Lahman rates from the formula card's MLB stats
    const s = formula.mlbBattingStats;
    const PA = s.AB + s.BB;
    if (PA < 50) continue; // Skip low-PA players for cleaner regression

    const singles = Math.max(0, s.H - s.doubles - s.triples - s.HR);

    matched.push({
      year,
      bbwLastName: bbw.lastName,
      bbwFirstName: bbw.firstName,
      bbwCard: bbw.card,
      bbwBatting: batting,
      bbwIsPitcher,
      formulaCard: formula,
      lahmanRates: {
        walkRate: s.BB / PA,
        soRate: s.SO / PA,
        hrRate: s.HR / PA,
        singleRate: singles / PA,
        doubleRate: s.doubles / PA,
        tripleRate: s.triples / PA,
        sbRate: s.SB / Math.max(1, PA),
        iso: s.SLG - s.BA,
        PA,
      },
    });
  }

  return matched;
}

// Load all data once
let allMatched: MatchedPair[] = [];

beforeAll(() => {
  for (const year of BBW_SEASONS) {
    const bbw = loadBbwSeason(year);
    const formulaCards = loadLahmanSeason(year);
    const matched = matchPlayers(bbw.players, bbw.batting, formulaCards, year);
    allMatched.push(...matched);
  }
});

describe('Multi-Season Calibration Harness', () => {
  it('matches sufficient players across all 3 seasons', () => {
    console.log(`\n=== Multi-Season Match Summary ===`);
    for (const year of BBW_SEASONS) {
      const all = allMatched.filter((m) => m.year === year);
      const batters = all.filter((m) => !m.bbwIsPitcher && !m.formulaCard.isPitcher);
      const pitchers = all.filter((m) => m.bbwIsPitcher);
      console.log(`  ${year}: ${all.length} total (${batters.length} batters, ${pitchers.length} BBW pitchers)`);
    }
    const totalBatters = allMatched.filter((m) => !m.bbwIsPitcher && !m.formulaCard.isPitcher).length;
    console.log(`  Total: ${allMatched.length} matched, ${totalBatters} batters (used for regression)`);

    expect(allMatched.length).toBeGreaterThanOrEqual(500);
  });

  it('fits linear regressions for all outcome types (batters only)', () => {
    // Filter to non-pitcher batters only -- pitchers have fundamentally different card patterns
    const batters = allMatched.filter((m) => !m.bbwIsPitcher && !m.formulaCard.isPitcher);

    // Define card value groups
    const outcomeTypes = [
      { name: 'walk', values: [13], rateKey: 'walkRate' as const },
      { name: 'strikeout', values: [14], rateKey: 'soRate' as const },
      { name: 'homeRun', values: [1, 5, 37, 41], rateKey: 'hrRate' as const },
      { name: 'single', values: [7, 8, 9], rateKey: 'singleRate' as const },
      { name: 'double', values: [0], rateKey: 'doubleRate' as const },
      { name: 'triple', values: [10, 11], rateKey: 'tripleRate' as const },
      { name: 'speed', values: [21, 23, 36], rateKey: 'sbRate' as const },
    ];

    console.log(`\n=== Regression Coefficients (batters only, N=${batters.length}) ===`);
    console.log('Outcome    | Slope    | Intercept | R-squared | Pearson r');
    console.log('-----------|----------|-----------|-----------|----------');

    const coefficients: Record<string, { slope: number; intercept: number; r2: number; r: number }> = {};

    for (const ot of outcomeTypes) {
      const x = batters.map((m) => m.lahmanRates[ot.rateKey]);
      const y = batters.map((m) => countValues(m.bbwCard, ot.values));

      const reg = fitLinearRegression(x, y);
      const r = pearsonR(x, y);

      coefficients[ot.name] = { ...reg, r };

      console.log(
        `${ot.name.padEnd(10)} | ${reg.slope.toFixed(3).padStart(8)} | ${reg.intercept.toFixed(3).padStart(9)} | ${reg.r2.toFixed(4).padStart(9)} | ${r.toFixed(4).padStart(8)}`,
      );
    }

    // Per-season breakdown
    for (const year of BBW_SEASONS) {
      const yearBatters = batters.filter((m) => m.year === year);
      console.log(`\n--- ${year} Season (N=${yearBatters.length}) ---`);
      for (const ot of outcomeTypes) {
        const x = yearBatters.map((m) => m.lahmanRates[ot.rateKey]);
        const y = yearBatters.map((m) => countValues(m.bbwCard, ot.values));
        const r = pearsonR(x, y);
        console.log(`  ${ot.name.padEnd(10)}: r = ${r.toFixed(4)}`);
      }
    }

    // Output as copy-pasteable TypeScript constants
    console.log('\n=== Copy-Paste Coefficients (for calibration-coefficients.ts) ===');
    console.log('export const CALIBRATED_SLOPES = {');
    for (const ot of outcomeTypes) {
      const c = coefficients[ot.name];
      console.log(`  ${ot.name}: ${c.slope.toFixed(4)},`);
    }
    console.log('} as const;');

    console.log('\nexport const CALIBRATED_INTERCEPTS = {');
    for (const ot of outcomeTypes) {
      const c = coefficients[ot.name];
      console.log(`  ${ot.name}: ${c.intercept.toFixed(4)},`);
    }
    console.log('} as const;');

    // With pitchers filtered, correlations should be positive for key outcomes.
    // Walk/K have weaker correlation because BBW assigns these differently than raw rate * slots.
    // Single, double, HR have strong correlations (r > 0.5).
    expect(coefficients.walk.r).toBeGreaterThan(0.1);
    expect(coefficients.strikeout.r).toBeGreaterThan(0.05);
    expect(coefficients.single.r).toBeGreaterThan(0.5);
    expect(coefficients.double.r).toBeGreaterThan(0.5);
    expect(coefficients.homeRun.r).toBeGreaterThan(0.4);
  });

  it('computes power rating regression (card[24] vs ISO, batters only)', () => {
    const batters = allMatched.filter((m) => !m.bbwIsPitcher && !m.formulaCard.isPitcher);
    const x = batters.map((m) => m.lahmanRates.iso);
    const y = batters.map((m) => m.bbwCard[24]);

    const reg = fitLinearRegression(x, y);
    const r = pearsonR(x, y);

    console.log(`\n=== Power Rating Regression ===`);
    console.log(`card[24] = ${reg.slope.toFixed(3)} * ISO + ${reg.intercept.toFixed(3)}`);
    console.log(`R-squared: ${reg.r2.toFixed(4)}, Pearson r: ${r.toFixed(4)}`);

    // Analyze BBW power distribution by ISO bucket
    const buckets = [
      { label: 'ISO < 0.050', min: -Infinity, max: 0.050 },
      { label: '0.050-0.079', min: 0.050, max: 0.080 },
      { label: '0.080-0.109', min: 0.080, max: 0.110 },
      { label: '0.110-0.149', min: 0.110, max: 0.150 },
      { label: '0.150-0.189', min: 0.150, max: 0.190 },
      { label: '0.190-0.229', min: 0.190, max: 0.230 },
      { label: '0.230-0.279', min: 0.230, max: 0.280 },
      { label: 'ISO >= 0.280', min: 0.280, max: Infinity },
    ];

    console.log('\nISO Bucket     | Count | BBW Mean card[24] | Mode');
    console.log('---------------|-------|-------------------|-----');
    for (const bucket of buckets) {
      const inBucket = batters.filter(
        (m) => m.lahmanRates.iso >= bucket.min && m.lahmanRates.iso < bucket.max,
      );
      if (inBucket.length === 0) {
        console.log(`${bucket.label.padEnd(14)} |     0 |                   |`);
        continue;
      }
      const powers = inBucket.map((m) => m.bbwCard[24]);
      const mean = powers.reduce((a, b) => a + b, 0) / powers.length;

      // Find mode
      const freq: Record<number, number> = {};
      for (const p of powers) freq[p] = (freq[p] || 0) + 1;
      const mode = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);

      console.log(
        `${bucket.label.padEnd(14)} | ${String(inBucket.length).padStart(5)} | ${mean.toFixed(2).padStart(17)} | ${String(mode).padStart(4)}`,
      );
    }

    // Power may have weak ISO correlation -- BBW may use era-relative power or different metrics
    // Just verify we have data to analyze
    expect(batters.length).toBeGreaterThan(100);
  });

  it('analyzes archetype (bytes 33-34) distribution', () => {
    // Count BBW archetype distribution
    const bbwArchetypes: Record<string, number> = {};
    const formulaArchetypes: Record<string, number> = {};
    let exactMatch = 0;

    for (const m of allMatched) {
      const bbwKey = `${m.bbwCard[33]},${m.bbwCard[34]}`;
      const fmKey = `${m.formulaCard.card[33]},${m.formulaCard.card[34]}`;
      bbwArchetypes[bbwKey] = (bbwArchetypes[bbwKey] || 0) + 1;
      formulaArchetypes[fmKey] = (formulaArchetypes[fmKey] || 0) + 1;
      if (bbwKey === fmKey) exactMatch++;
    }

    console.log(`\n=== Archetype Distribution ===`);
    console.log(`Exact match: ${exactMatch}/${allMatched.length} (${(100 * exactMatch / allMatched.length).toFixed(1)}%)`);

    console.log('\nArchetype | BBW Count | Formula Count | Description');
    console.log('----------|-----------|---------------|------------');
    const archetypeLabels: Record<string, string> = {
      '7,0': 'Standard RH',
      '0,1': 'Standard LH/Switch',
      '1,0': 'Power RH',
      '1,1': 'Power LH/Switch',
      '6,0': 'Speed',
      '0,2': 'Contact + Speed',
      '0,6': 'Pitcher',
      '8,0': 'Elite Defense',
      '5,0': 'Utility',
    };

    const allKeys = new Set([...Object.keys(bbwArchetypes), ...Object.keys(formulaArchetypes)]);
    for (const key of [...allKeys].sort()) {
      const bbwCount = bbwArchetypes[key] || 0;
      const fmCount = formulaArchetypes[key] || 0;
      const label = archetypeLabels[key] || 'Unknown';
      console.log(
        `${key.padEnd(9)} | ${String(bbwCount).padStart(9)} | ${String(fmCount).padStart(13)} | ${label}`,
      );
    }

    // Analyze what Lahman stats correlate with BBW archetype assignments
    // For power archetype (1,0) and (1,1)
    const powerPlayers = allMatched.filter(
      (m) => m.bbwCard[33] === 1 && (m.bbwCard[34] === 0 || m.bbwCard[34] === 1),
    );
    const nonPowerBatters = allMatched.filter(
      (m) => m.bbwCard[33] !== 1 && m.bbwCard[33] !== 0 || m.bbwCard[34] !== 6,
    );

    if (powerPlayers.length > 0) {
      const hrStats = powerPlayers.map((m) => m.formulaCard.mlbBattingStats?.HR ?? 0);
      const isoStats = powerPlayers.map((m) => m.lahmanRates.iso);
      const minHR = Math.min(...hrStats);
      const minISO = Math.min(...isoStats);
      console.log(`\nPower archetype players: ${powerPlayers.length}`);
      console.log(`  Min HR: ${minHR}, Min ISO: ${minISO.toFixed(3)}`);

      // Find the optimal thresholds by scanning
      const hrThresholds = [15, 18, 20, 22, 25, 28, 30];
      const isoThresholds = [0.150, 0.170, 0.190, 0.210, 0.230, 0.250];

      console.log('\n  Threshold Analysis (HR OR ISO):');
      for (const hrT of hrThresholds) {
        for (const isoT of isoThresholds) {
          let tp = 0, fp = 0, fn = 0;
          for (const m of allMatched) {
            const bbwIsPower = m.bbwCard[33] === 1;
            const hr = m.formulaCard.mlbBattingStats?.HR ?? 0;
            const iso = m.lahmanRates.iso;
            const predicted = hr >= hrT || iso >= isoT;
            if (bbwIsPower && predicted) tp++;
            else if (!bbwIsPower && predicted) fp++;
            else if (bbwIsPower && !predicted) fn++;
          }
          const precision = tp / Math.max(1, tp + fp);
          const recall = tp / Math.max(1, tp + fn);
          const f1 = 2 * precision * recall / Math.max(0.001, precision + recall);
          if (f1 > 0.35) {
            console.log(`    HR>=${hrT} OR ISO>=${isoT.toFixed(3)}: P=${precision.toFixed(2)} R=${recall.toFixed(2)} F1=${f1.toFixed(3)}`);
          }
        }
      }
    }

    // For speed archetype (6,0)
    const speedPlayers = allMatched.filter((m) => m.bbwCard[33] === 6 && m.bbwCard[34] === 0);
    if (speedPlayers.length > 0) {
      const sbStats = speedPlayers.map((m) => m.formulaCard.mlbBattingStats?.SB ?? 0);
      const minSB = Math.min(...sbStats);
      console.log(`\nSpeed archetype players: ${speedPlayers.length}`);
      console.log(`  Min SB: ${minSB}`);
    }

    expect(exactMatch).toBeGreaterThan(0);
  });

  it('analyzes pitcher grade distribution', () => {
    // Filter matched players who are pitchers in BBW
    const pitchers = allMatched.filter((m) => {
      const posStr = m.formulaCard.primaryPosition;
      return posStr === 'SP' || posStr === 'RP' || posStr === 'CL';
    });

    if (pitchers.length === 0) {
      console.log('No matched pitchers found');
      return;
    }

    // Extract BBW grades from position string
    const gradeData: { bbwGrade: number; formulaGrade: number; era: number }[] = [];
    for (const m of pitchers) {
      // BBW grade is in position string, but we can't access it from matched pair
      // Instead compare formula grade vs BBW card characteristics
      if (m.formulaCard.pitching) {
        const fGrade = m.formulaCard.pitching.grade;
        const fEra = m.formulaCard.pitching.era;
        gradeData.push({ bbwGrade: 0, formulaGrade: fGrade, era: fEra });
      }
    }

    console.log(`\n=== Pitcher Grade Analysis ===`);
    console.log(`Matched pitchers: ${pitchers.length}`);

    if (gradeData.length > 0) {
      const formulaGrades = gradeData.map((d) => d.formulaGrade);
      const maxGrade = Math.max(...formulaGrades);
      const minGrade = Math.min(...formulaGrades);
      const meanGrade = formulaGrades.reduce((a, b) => a + b, 0) / formulaGrades.length;
      console.log(`Formula grade range: ${minGrade}-${maxGrade}, mean: ${meanGrade.toFixed(1)}`);

      // Distribution
      const gradeDist: Record<number, number> = {};
      for (const g of formulaGrades) gradeDist[g] = (gradeDist[g] || 0) + 1;
      console.log('Grade distribution:');
      for (let g = 1; g <= 22; g++) {
        if (gradeDist[g]) console.log(`  Grade ${g}: ${gradeDist[g]}`);
      }
    }

    expect(pitchers.length).toBeGreaterThan(0);
  });

  it('outputs gate position analysis', () => {
    // Analyze what values BBW puts at gate positions 0, 15, 20
    const pos0vals: Record<number, number> = {};
    const pos15vals: Record<number, number> = {};
    const pos20vals: Record<number, number> = {};

    for (const m of allMatched) {
      const v0 = m.bbwCard[0];
      const v15 = m.bbwCard[15];
      const v20 = m.bbwCard[20];
      pos0vals[v0] = (pos0vals[v0] || 0) + 1;
      pos15vals[v15] = (pos15vals[v15] || 0) + 1;
      pos20vals[v20] = (pos20vals[v20] || 0) + 1;
    }

    console.log('\n=== Gate Position Analysis (all matched players) ===');
    const printDist = (label: string, dist: Record<number, number>) => {
      const total = Object.values(dist).reduce((a, b) => a + b, 0);
      const sorted = Object.entries(dist).sort((a, b) => Number(b[1]) - Number(a[1]));
      console.log(`\n${label}:`);
      for (const [val, count] of sorted.slice(0, 10)) {
        console.log(`  Value ${val.padStart(3)}: ${String(count).padStart(5)} (${(100 * count / total).toFixed(1)}%)`);
      }
    };

    printDist('Position 0 (primary gate)', pos0vals);
    printDist('Position 15 (power gate)', pos15vals);
    printDist('Position 20 (K gate)', pos20vals);

    expect(Object.keys(pos0vals).length).toBeGreaterThan(0);
  });
});
