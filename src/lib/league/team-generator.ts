/**
 * Team Name Generator
 *
 * REQ-LGE-004: Auto-generate team names using real US cities and
 * fictional mascot names. Selection is randomized without replacement
 * using SeededRNG for determinism.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import { AppError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';

export interface TeamName {
  city: string;
  mascot: string;
}

/** Real US cities for team generation. */
export const US_CITIES: readonly string[] = [
  'Atlanta', 'Austin', 'Baltimore', 'Birmingham', 'Boston',
  'Brooklyn', 'Buffalo', 'Charlotte', 'Chicago', 'Cincinnati',
  'Cleveland', 'Columbus', 'Dallas', 'Denver', 'Detroit',
  'El Paso', 'Fort Worth', 'Fresno', 'Hartford', 'Houston',
  'Indianapolis', 'Jacksonville', 'Kansas City', 'Las Vegas', 'Louisville',
  'Memphis', 'Miami', 'Milwaukee', 'Minneapolis', 'Nashville',
  'New Orleans', 'Newark', 'Norfolk', 'Oakland', 'Oklahoma City',
  'Omaha', 'Orlando', 'Philadelphia', 'Phoenix', 'Pittsburgh',
  'Portland', 'Providence', 'Raleigh', 'Richmond', 'Sacramento',
  'Salt Lake City', 'San Antonio', 'San Diego', 'San Francisco', 'San Jose',
  'Seattle', 'St. Louis', 'Tampa', 'Tucson', 'Tulsa',
  'Virginia Beach', 'Washington',
];

/** Fictional mascot names for team generation. */
export const MASCOTS: readonly string[] = [
  'Aces', 'Armadillos', 'Barons', 'Barracudas', 'Bison',
  'Blazers', 'Bolts', 'Broncos', 'Buffaloes', 'Captains',
  'Cavaliers', 'Cobras', 'Comets', 'Condors', 'Coyotes',
  'Cyclones', 'Dragons', 'Eagles', 'Falcons', 'Firebirds',
  'Foxes', 'Gators', 'Gladiators', 'Grizzlies', 'Hawks',
  'Herons', 'Hornets', 'Huskies', 'Ironmen', 'Jaguars',
  'Knights', 'Lancers', 'Leopards', 'Lions', 'Lynx',
  'Mavericks', 'Monarchs', 'Mustangs', 'Nighthawks', 'Ospreys',
  'Otters', 'Panthers', 'Pelicans', 'Pines', 'Pioneers',
  'Raptors', 'Ravens', 'Rockets', 'Scorpions', 'Sentinels',
  'Sharks', 'Stallions', 'Stingrays', 'Storm', 'Thunderbolts',
  'Timberwolves', 'Titans', 'Vipers', 'Voyagers', 'Wolves',
];

/** Minimum team count per REQ-LGE-001. */
const MIN_TEAMS = 18;

/** Maximum team count per REQ-LGE-001. */
const MAX_TEAMS = 30;

/**
 * Shuffle an array in place using Fisher-Yates with SeededRNG.
 */
function shuffleArray<T>(arr: T[], rng: SeededRNG): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate team names by pairing random cities with random mascots.
 *
 * @param count - Number of teams to generate (18, 24, or 30)
 * @param rng - Seeded RNG for deterministic selection
 * @returns Array of {city, mascot} pairs with no duplicates
 * @throws AppError if count is invalid
 */
export function generateTeamNames(count: number, rng: SeededRNG): TeamName[] {
  if (count < MIN_TEAMS || count > MAX_TEAMS) {
    throw new AppError(
      'VALIDATION',
      ERROR_CODES.VALIDATION_FAILED,
      `Team count must be between ${MIN_TEAMS} and ${MAX_TEAMS}, got ${count}`,
      400,
    );
  }
  if (count % 2 !== 0) {
    throw new AppError(
      'VALIDATION',
      ERROR_CODES.VALIDATION_FAILED,
      `Team count must be even, got ${count}`,
      400,
    );
  }

  const shuffledCities = shuffleArray([...US_CITIES], rng);
  const shuffledMascots = shuffleArray([...MASCOTS], rng);

  const names: TeamName[] = [];
  for (let i = 0; i < count; i++) {
    names.push({
      city: shuffledCities[i],
      mascot: shuffledMascots[i],
    });
  }

  return names;
}
