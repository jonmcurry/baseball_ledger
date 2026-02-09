import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  loadPeople,
  mapBattingHand,
  mapThrowingHand,
  transformPeopleRow,
} from '@lib/csv/people-loader';
import type { RawPeopleRow } from '@lib/csv/csv-types';

const miniPeopleCsv = readFileSync(
  resolve(__dirname, '../../../fixtures/mini-lahman/People.csv'),
  'utf-8',
);

describe('mapBattingHand', () => {
  it('maps B (both) to S (switch)', () => {
    expect(mapBattingHand('B')).toBe('S');
  });

  it('passes L through', () => {
    expect(mapBattingHand('L')).toBe('L');
  });

  it('passes R through', () => {
    expect(mapBattingHand('R')).toBe('R');
  });

  it('defaults empty to R', () => {
    expect(mapBattingHand('')).toBe('R');
  });
});

describe('mapThrowingHand', () => {
  it('maps B to R', () => {
    expect(mapThrowingHand('B')).toBe('R');
  });

  it('maps S to R', () => {
    expect(mapThrowingHand('S')).toBe('R');
  });

  it('passes L through', () => {
    expect(mapThrowingHand('L')).toBe('L');
  });

  it('passes R through', () => {
    expect(mapThrowingHand('R')).toBe('R');
  });

  it('defaults empty to R', () => {
    expect(mapThrowingHand('')).toBe('R');
  });
});

describe('transformPeopleRow', () => {
  it('transforms a valid row to PersonRecord', () => {
    const raw: RawPeopleRow = {
      playerID: 'ruthba01',
      nameFirst: 'Babe',
      nameLast: 'Ruth',
      birthYear: '1895',
      bats: 'L',
      throws: 'L',
      debut: '1914-07-11',
      finalGame: '1935-05-30',
    };
    const result = transformPeopleRow(raw);

    expect(result).not.toBeNull();
    expect(result!.playerID).toBe('ruthba01');
    expect(result!.nameFirst).toBe('Babe');
    expect(result!.nameLast).toBe('Ruth');
    expect(result!.birthYear).toBe(1895);
    expect(result!.battingHand).toBe('L');
    expect(result!.throwingHand).toBe('L');
    expect(result!.debutYear).toBe(1914);
    expect(result!.finalYear).toBe(1935);
  });

  it('returns null for missing playerID', () => {
    const raw: RawPeopleRow = {
      playerID: '',
      nameFirst: 'Nobody',
      nameLast: 'None',
      birthYear: '1900',
      bats: 'R',
      throws: 'R',
      debut: '',
      finalGame: '',
    };
    expect(transformPeopleRow(raw)).toBeNull();
  });

  it('handles empty debut/finalGame as null years', () => {
    const raw: RawPeopleRow = {
      playerID: 'testpl01',
      nameFirst: 'Test',
      nameLast: 'Player',
      birthYear: '1950',
      bats: 'R',
      throws: 'R',
      debut: '',
      finalGame: '',
    };
    const result = transformPeopleRow(raw);

    expect(result!.debutYear).toBeNull();
    expect(result!.finalYear).toBeNull();
  });

  it('maps switch hitter bats=B to S', () => {
    const raw: RawPeopleRow = {
      playerID: 'switch01',
      nameFirst: 'Switch',
      nameLast: 'Hitter',
      birthYear: '1940',
      bats: 'B',
      throws: 'R',
      debut: '1960-04-01',
      finalGame: '1975-09-30',
    };
    const result = transformPeopleRow(raw);

    expect(result!.battingHand).toBe('S');
  });
});

describe('loadPeople (mini-lahman)', () => {
  it('loads all players from fixture', () => {
    const result = loadPeople(miniPeopleCsv);

    expect(result.data.size).toBe(53);
    expect(result.rowsProcessed).toBe(53);
    expect(result.rowsSkipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('can look up a specific player by ID', () => {
    const result = loadPeople(miniPeopleCsv);
    const blue = result.data.get('bluevi01');

    expect(blue).toBeDefined();
    expect(blue!.nameFirst).toBe('Vida');
    expect(blue!.nameLast).toBe('Blue');
    expect(blue!.throwingHand).toBe('L');
  });

  it('correctly maps switch hitters', () => {
    const result = loadPeople(miniPeopleCsv);
    // Sandy Alomar Sr. is bats=B in the CSV
    const alomar = result.data.get('alomasa01');

    expect(alomar).toBeDefined();
    expect(alomar!.battingHand).toBe('S');
  });
});
