// Barrel re-exports for @lib/csv

export type {
  RawPeopleRow,
  RawBattingRow,
  RawPitchingRow,
  RawFieldingRow,
  PersonRecord,
  BattingSeasonRecord,
  PitchingSeasonRecord,
  FieldingSeasonRecord,
  PlayerPoolEntry,
  LeagueAverages,
  CsvParseResult,
} from './csv-types';

export {
  parseCsvStream,
  parseCsvFull,
  safeParseInt,
  safeParseFloat,
} from './parser';

export {
  loadPeople,
  transformPeopleRow,
  mapBattingHand,
  mapThrowingHand,
} from './people-loader';

export {
  loadBatting,
  transformBattingRow,
  aggregateBattingStints,
  computeBattingDerived,
} from './batting-loader';

export {
  loadPitching,
  transformPitchingRow,
  aggregatePitchingStints,
  ipoutsToIP,
  computePitchingDerived,
} from './pitching-loader';

export {
  loadFielding,
  transformFieldingRow,
  mapFieldingPosition,
} from './fielding-loader';

export {
  buildPlayerPool,
  computeLeagueAverages,
  qualifiesAsBatter,
  qualifiesAsPitcher,
} from './player-pool';
