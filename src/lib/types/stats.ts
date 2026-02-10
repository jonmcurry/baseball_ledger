export interface BattingStats {
  G: number;
  AB: number;
  R: number;
  H: number;
  doubles: number;
  triples: number;
  HR: number;
  RBI: number;
  SB: number;
  CS: number;
  BB: number;
  SO: number;
  IBB: number;
  HBP: number;
  SH: number;
  SF: number;
  GIDP: number;
  // Derived (computed, not stored)
  BA: number;
  OBP: number;
  SLG: number;
  OPS: number;
}

export interface PitchingStats {
  G: number;
  GS: number;
  W: number;
  L: number;
  SV: number;
  IP: number;       // Stored as decimal (e.g., 6.2 = 6 and 2/3)
  H: number;
  R: number;
  ER: number;
  HR: number;
  BB: number;
  SO: number;
  HBP: number;
  BF: number;       // Batters faced
  WP: number;
  BK: number;
  CG: number;
  SHO: number;
  HLD: number;
  BS: number;
  // Derived
  ERA: number;
  WHIP: number;
  FIP: number;
}
