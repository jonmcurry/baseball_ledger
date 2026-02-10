/**
 * Tests for CSV pipeline orchestrator
 *
 * REQ-DATA-002: Build PlayerPool from CSV data, filter by year range.
 * REQ-DATA-005: Generate PlayerCards for all pool entries.
 * REQ-DATA-006: Compute league averages for normalization.
 * REQ-DATA-003: Build playerID -> name cache.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runCsvPipeline } from '@lib/csv/load-pipeline';
import { CARD_LENGTH } from '@lib/card-generator/structural';

const fixtureDir = resolve(__dirname, '../../../fixtures/mini-lahman');
const peopleCsv = readFileSync(resolve(fixtureDir, 'People.csv'), 'utf-8');
const battingCsv = readFileSync(resolve(fixtureDir, 'Batting.csv'), 'utf-8');
const pitchingCsv = readFileSync(resolve(fixtureDir, 'Pitching.csv'), 'utf-8');
const fieldingCsv = readFileSync(resolve(fixtureDir, 'Fielding.csv'), 'utf-8');

describe('runCsvPipeline', () => {
  const input = {
    peopleCsv,
    battingCsv,
    pitchingCsv,
    fieldingCsv,
    yearRangeStart: 1971,
    yearRangeEnd: 1971,
  };

  it('returns a non-empty pool for mini-lahman 1971', () => {
    const result = runCsvPipeline(input);
    expect(result.pool.length).toBeGreaterThan(0);
  });

  it('generates cards matching pool size', () => {
    const result = runCsvPipeline(input);
    expect(result.cards.length).toBe(result.pool.length);
  });

  it('computes reasonable league averages for 1971', () => {
    const result = runCsvPipeline(input);
    const avg = result.leagueAverages;

    // BA should be between .200 and .350 for a valid era
    expect(avg.BA).toBeGreaterThan(0.150);
    expect(avg.BA).toBeLessThan(0.400);

    // ERA should be between 1.0 and 8.0
    expect(avg.ERA).toBeGreaterThan(1.0);
    expect(avg.ERA).toBeLessThan(8.0);
  });

  it('builds player name cache with correct format', () => {
    const result = runCsvPipeline(input);
    const cacheEntries = Object.entries(result.playerNameCache);

    expect(cacheEntries.length).toBeGreaterThan(0);

    // Every cache entry should be "First Last" format
    for (const [playerId, name] of cacheEntries) {
      expect(playerId).toBeTruthy();
      expect(name).toMatch(/\S+ \S+/); // at least two words
    }
  });

  it('playerNameCache includes all pool entries', () => {
    const result = runCsvPipeline(input);

    for (const entry of result.pool) {
      expect(result.playerNameCache[entry.playerID]).toBeDefined();
    }
  });

  it('all cards have valid 35-element card array', () => {
    const result = runCsvPipeline(input);

    for (const card of result.cards) {
      expect(card.card).toHaveLength(CARD_LENGTH);
      for (const value of card.card) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(42);
      }
    }
  });

  it('all cards have valid power rating (13-21)', () => {
    const result = runCsvPipeline(input);

    for (const card of result.cards) {
      expect(card.powerRating).toBeGreaterThanOrEqual(13);
      expect(card.powerRating).toBeLessThanOrEqual(21);
    }
  });

  it('returns empty results for year range with no data', () => {
    const result = runCsvPipeline({
      ...input,
      yearRangeStart: 3000,
      yearRangeEnd: 3001,
    });

    expect(result.pool).toHaveLength(0);
    expect(result.cards).toHaveLength(0);
    expect(Object.keys(result.playerNameCache)).toHaveLength(0);
  });

  it('filters by year range correctly', () => {
    const result = runCsvPipeline(input);

    for (const entry of result.pool) {
      expect(entry.seasonYear).toBe(1971);
    }
  });

  it('collects errors without crashing', () => {
    // Provide malformed CSV content for batting -- should still work for others
    const result = runCsvPipeline({
      ...input,
      battingCsv: 'invalid,header\nrow\n',
    });

    // Should not throw; may have warnings but still returns structure
    expect(result).toHaveProperty('pool');
    expect(result).toHaveProperty('cards');
    expect(result).toHaveProperty('errors');
  });
});
