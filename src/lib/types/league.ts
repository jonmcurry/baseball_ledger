import type { FullPlayoffBracket } from './schedule';

export type LeagueStatus =
  | 'setup'
  | 'drafting'
  | 'regular_season'
  | 'playoffs'
  | 'completed';

export interface ManagerProfile {
  name: string;
  style: 'conservative' | 'aggressive' | 'balanced' | 'analytical';

  // Decision thresholds (0.0-1.0 scale, higher = more likely to act)
  stealAttemptThreshold: number;
  buntThreshold: number;
  hitAndRunThreshold: number;
  pinchHitThreshold: number;
  intentionalWalkThreshold: number;
  pitcherPullThreshold: number;
  aggressiveBaserunning: number;

  // Inning-based modifiers (multiply threshold in late innings)
  lateInningMultiplier: number;   // Applied innings 7+
  extraInningMultiplier: number;  // Applied innings 10+
}

export interface LeagueSummary {
  readonly id: string;
  readonly name: string;
  readonly commissionerId: string;
  readonly inviteKey: string;
  readonly teamCount: number;
  readonly yearRangeStart: number;
  readonly yearRangeEnd: number;
  readonly injuriesEnabled: boolean;
  readonly status: LeagueStatus;
  readonly currentDay: number;
  readonly playoffBracket: FullPlayoffBracket | null;
}

export interface TeamSummary {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly ownerId: string | null;    // null = CPU-controlled team
  readonly managerProfile: string;
  readonly leagueDivision: 'AL' | 'NL';
  readonly division: string;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
}

export interface DivisionStandings {
  readonly leagueDivision: 'AL' | 'NL';
  readonly division: string;
  teams: TeamSummary[];               // Sorted by wins DESC
}
