// Layer 0: Pure type definitions (no logic, no side effects)

export type {
  ErrorCategory,
  AppError,
  ValidationDetail,
  ApiErrorResponse,
  ErrorLogEntry,
} from './errors';

export type {
  BattingStats,
  PitchingStats,
} from './stats';

export type {
  CardValue,
  Position,
  PlayerArchetype,
  PitcherAttributes,
  PlayerCard,
} from './player';

export {
  OutcomeCategory,
} from './game';
export type {
  BaseState,
  OutcomeTableEntry,
  LineupSlot,
  GamePitcherStats,
  BattingLine,
  PitchingLine,
  PlayByPlayEntry,
  TeamState,
  GameState,
  BoxScore,
  GameResult,
} from './game';

export type {
  LeagueStatus,
  ManagerProfile,
  LeagueSummary,
  TeamSummary,
  DivisionStandings,
} from './league';

export type {
  DraftPickResult,
  DraftState,
} from './draft';

export type {
  ScheduleGameSummary,
  ScheduleDay,
} from './schedule';

export type {
  RosterEntry,
  LineupUpdate,
} from './roster';

export type {
  ApiResponse,
  PaginatedResponse,
  JoinLeagueResult,
  GameDetail,
  TransactionResult,
  ArchiveSummary,
  SimulationProgress,
} from './api';
