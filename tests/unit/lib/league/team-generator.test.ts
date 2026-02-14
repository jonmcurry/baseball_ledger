import {
  generateTeamNames,
  US_CITIES,
  MASCOTS,
  type TeamName,
} from '@lib/league/team-generator';
import { SeededRNG } from '@lib/rng/seeded-rng';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('team-generator: constants', () => {
  it('has at least 50 US cities', () => {
    expect(US_CITIES.length).toBeGreaterThanOrEqual(50);
  });

  it('has at least 50 mascots', () => {
    expect(MASCOTS.length).toBeGreaterThanOrEqual(50);
  });

  it('cities have no duplicates', () => {
    const unique = new Set(US_CITIES);
    expect(unique.size).toBe(US_CITIES.length);
  });

  it('mascots have no duplicates', () => {
    const unique = new Set(MASCOTS);
    expect(unique.size).toBe(MASCOTS.length);
  });

  it('all city names are non-empty strings', () => {
    for (const city of US_CITIES) {
      expect(city.length).toBeGreaterThan(0);
    }
  });

  it('all mascot names are non-empty strings', () => {
    for (const mascot of MASCOTS) {
      expect(mascot.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// generateTeamNames
// ---------------------------------------------------------------------------
describe('generateTeamNames (REQ-LGE-004)', () => {
  it('generates the requested number of teams', () => {
    const names = generateTeamNames(18, new SeededRNG(42));
    expect(names).toHaveLength(18);
  });

  it('returns objects with city and mascot properties', () => {
    const names = generateTeamNames(18, new SeededRNG(1));
    for (const name of names) {
      expect(name).toHaveProperty('city');
      expect(name).toHaveProperty('mascot');
      expect(name.city.length).toBeGreaterThan(0);
      expect(name.mascot.length).toBeGreaterThan(0);
    }
  });

  it('does not repeat cities within a single generation', () => {
    const names = generateTeamNames(30, new SeededRNG(99));
    const cities = names.map((n) => n.city);
    expect(new Set(cities).size).toBe(30);
  });

  it('does not repeat mascots within a single generation', () => {
    const names = generateTeamNames(30, new SeededRNG(99));
    const mascots = names.map((n) => n.mascot);
    expect(new Set(mascots).size).toBe(30);
  });

  it('is deterministic with same seed', () => {
    const names1 = generateTeamNames(18, new SeededRNG(42));
    const names2 = generateTeamNames(18, new SeededRNG(42));
    expect(names1).toEqual(names2);
  });

  it('produces different results with different seeds', () => {
    const names1 = generateTeamNames(18, new SeededRNG(1));
    const names2 = generateTeamNames(18, new SeededRNG(2));
    // At least some should differ
    const allSame = names1.every((n, i) => n.city === names2[i].city);
    expect(allSame).toBe(false);
  });

  it('throws for count below 18', () => {
    expect(() => generateTeamNames(4, new SeededRNG(1))).toThrow();
    expect(() => generateTeamNames(2, new SeededRNG(1))).toThrow();
  });

  it('throws for odd count', () => {
    expect(() => generateTeamNames(7, new SeededRNG(1))).toThrow();
  });

  it('throws for count above 30', () => {
    expect(() => generateTeamNames(34, new SeededRNG(1))).toThrow();
  });

  it('works at minimum (18 teams)', () => {
    const names = generateTeamNames(18, new SeededRNG(10));
    expect(names).toHaveLength(18);
  });

  it('works at maximum (30 teams)', () => {
    const names = generateTeamNames(30, new SeededRNG(10));
    expect(names).toHaveLength(30);
  });

  it('cities come from the US_CITIES list', () => {
    const names = generateTeamNames(24, new SeededRNG(5));
    for (const name of names) {
      expect(US_CITIES).toContain(name.city);
    }
  });

  it('mascots come from the MASCOTS list', () => {
    const names = generateTeamNames(24, new SeededRNG(5));
    for (const name of names) {
      expect(MASCOTS).toContain(name.mascot);
    }
  });
});
