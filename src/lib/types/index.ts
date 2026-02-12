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
  MlbBattingStats,
  MlbPitchingStats,
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
  PlayoffRoundName,
  PlayoffTeamSeed,
  PlayoffGame,
  PlayoffSeries,
  PlayoffRound,
  PlayoffBracket,
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

export type {
  CommentaryStyle,
  AiSource,
  CommentaryRequest,
  CommentaryResponse,
  GameSummaryRequest,
  GameSummaryResponse,
  TradeEvaluationRequest,
  TradeEvaluationResponse,
  DraftReasoningRequest,
  DraftReasoningResponse,
  ManagerDecisionType,
  ManagerExplanationRequest,
  ManagerExplanationResponse,
} from './ai';
