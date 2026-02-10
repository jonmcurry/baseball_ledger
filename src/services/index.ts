/**
 * Service Barrel Export
 *
 * Re-exports all real service modules for clean imports.
 * Mock services remain available at their original paths for
 * development/testing when Supabase is not available.
 *
 * Usage:
 *   import { fetchLeague, createLeague } from '@services/league-service';
 *   import { apiGet } from '@services/api-client';
 */

export {
  fetchLeague,
  createLeague,
  deleteLeague,
  joinLeague,
  fetchTeams,
  fetchStandings,
  fetchSchedule,
} from './league-service';

export {
  fetchRoster,
  updateTeam,
  updateLineup,
} from './roster-service';

export {
  fetchBattingLeaders,
  fetchPitchingLeaders,
  fetchTeamStats,
} from './stats-service';

export {
  startSimulation,
  subscribeToProgress,
  unsubscribeFromProgress,
} from './simulation-service';

export {
  startDraft,
  submitPick,
  fetchDraftState,
  autoPick,
} from './draft-service';

export {
  apiGet,
  apiGetPaginated,
  apiPost,
  apiPatch,
  apiDelete,
} from './api-client';

export {
  generateCommentary,
  generateGameSummary,
  evaluateTrade,
  generateDraftReasoning,
  explainManagerDecision,
} from './ai-service';
